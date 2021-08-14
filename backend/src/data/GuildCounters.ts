import moment from "moment-timezone";
import { FindConditions, getRepository, In, IsNull, Not, Repository } from "typeorm";
import { Queue } from "../Queue";
import { DAYS, DBDateFormat, HOURS, MINUTES } from "../utils";
import { BaseGuildRepository } from "./BaseGuildRepository";
import { connection } from "./db";
import { Counter } from "./entities/Counter";
import { CounterTrigger, isValidCounterComparisonOp, TriggerComparisonOp } from "./entities/CounterTrigger";
import { CounterTriggerState } from "./entities/CounterTriggerState";
import { CounterValue } from "./entities/CounterValue";

const DELETE_UNUSED_COUNTERS_AFTER = 1 * DAYS;
const DELETE_UNUSED_COUNTER_TRIGGERS_AFTER = 1 * DAYS;

const MAX_COUNTER_VALUE = 2147483647; // 2^31-1, for MySQL INT

const decayQueue = new Queue();

async function deleteCountersMarkedToBeDeleted(): Promise<void> {
  await getRepository(Counter)
    .createQueryBuilder()
    .where("delete_at <= NOW()")
    .delete()
    .execute();
}

async function deleteTriggersMarkedToBeDeleted(): Promise<void> {
  await getRepository(CounterTrigger)
    .createQueryBuilder()
    .where("delete_at <= NOW()")
    .delete()
    .execute();
}

setInterval(deleteCountersMarkedToBeDeleted, 1 * HOURS);
setInterval(deleteTriggersMarkedToBeDeleted, 1 * HOURS);

setTimeout(deleteCountersMarkedToBeDeleted, 1 * MINUTES);
setTimeout(deleteTriggersMarkedToBeDeleted, 1 * MINUTES);

export class GuildCounters extends BaseGuildRepository {
  private counters: Repository<Counter>;
  private counterValues: Repository<CounterValue>;
  private counterTriggers: Repository<CounterTrigger>;
  private counterTriggerStates: Repository<CounterTriggerState>;

  constructor(guildId) {
    super(guildId);
    this.counters = getRepository(Counter);
    this.counterValues = getRepository(CounterValue);
    this.counterTriggers = getRepository(CounterTrigger);
    this.counterTriggerStates = getRepository(CounterTriggerState);
  }

  async findOrCreateCounter(name: string, perChannel: boolean, perUser: boolean): Promise<Counter> {
    const existing = await this.counters.findOne({
      where: {
        guild_id: this.guildId,
        name,
      },
    });

    if (existing) {
      // If the existing counter's properties match the ones we're looking for, return it.
      // Otherwise, delete the existing counter and re-create it with the proper properties.
      if (existing.per_channel === perChannel && existing.per_user === perUser) {
        await this.counters.update({ id: existing.id }, { delete_at: null });

        return existing;
      }

      await this.counters.delete({ id: existing.id });
    }

    const insertResult = await this.counters.insert({
      guild_id: this.guildId,
      name,
      per_channel: perChannel,
      per_user: perUser,
      last_decay_at: moment.utc().format(DBDateFormat),
    });

    return (await this.counters.findOne({
      where: {
        id: insertResult.identifiers[0].id,
      },
    }))!;
  }

  async markUnusedCountersToBeDeleted(idsToKeep: number[]): Promise<void> {
    const criteria: FindConditions<Counter> = {
      guild_id: this.guildId,
      delete_at: IsNull(),
    };

    if (idsToKeep.length) {
      criteria.id = Not(In(idsToKeep));
    }

    const deleteAt = moment
      .utc()
      .add(DELETE_UNUSED_COUNTERS_AFTER, "ms")
      .format(DBDateFormat);

    await this.counters.update(criteria, {
      delete_at: deleteAt,
    });
  }

  async deleteCountersMarkedToBeDeleted(): Promise<void> {
    await this.counters
      .createQueryBuilder()
      .where("delete_at <= NOW()")
      .delete()
      .execute();
  }

  async changeCounterValue(
    id: number,
    channelId: string | null,
    userId: string | null,
    change: number,
    initialValue: number,
  ): Promise<void> {
    if (typeof change !== "number" || Number.isNaN(change) || !Number.isFinite(change)) {
      throw new Error(`changeCounterValue() change argument must be a number`);
    }

    channelId = channelId || "0";
    userId = userId || "0";

    const rawUpdate =
      change >= 0 ? `value = LEAST(value + ${change}, ${MAX_COUNTER_VALUE})` : `value = GREATEST(value ${change}, 0)`;

    await this.counterValues.query(
      `
      INSERT INTO counter_values (counter_id, channel_id, user_id, value)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE ${rawUpdate}
    `,
      [id, channelId, userId, Math.max(initialValue + change, 0)],
    );
  }

  async setCounterValue(id: number, channelId: string | null, userId: string | null, value: number): Promise<void> {
    if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) {
      throw new Error(`setCounterValue() value argument must be a number`);
    }

    channelId = channelId || "0";
    userId = userId || "0";

    value = Math.max(value, 0);

    await this.counterValues.query(
      `
      INSERT INTO counter_values (counter_id, channel_id, user_id, value)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE value = ?
    `,
      [id, channelId, userId, value, value],
    );
  }

  decay(id: number, decayPeriodMs: number, decayAmount: number) {
    return decayQueue.add(async () => {
      const counter = (await this.counters.findOne({
        where: {
          id,
        },
      }))!;

      const diffFromLastDecayMs = moment.utc().diff(moment.utc(counter.last_decay_at!), "ms");
      if (diffFromLastDecayMs < decayPeriodMs) {
        return;
      }

      const decayAmountToApply = Math.round((diffFromLastDecayMs / decayPeriodMs) * decayAmount);
      if (decayAmountToApply === 0) {
        return;
      }

      // Calculate new last_decay_at based on the rounded decay amount we applied. This makes it so that over time, the decayed amount will stay accurate, even if we round some here.
      const newLastDecayDate = moment
        .utc(counter.last_decay_at)
        .add((decayAmountToApply / decayAmount) * decayPeriodMs, "ms")
        .format(DBDateFormat);

      const rawUpdate =
        decayAmountToApply >= 0
          ? `GREATEST(value - ${decayAmountToApply}, 0)`
          : `LEAST(value + ${Math.abs(decayAmountToApply)}, ${MAX_COUNTER_VALUE})`;

      // Using an UPDATE with ORDER BY in an attempt to avoid deadlocks from simultaneous decays
      // Also see https://dev.mysql.com/doc/refman/8.0/en/innodb-deadlocks-handling.html
      await this.counterValues
        .createQueryBuilder("CounterValue")
        .where("counter_id = :id", { id })
        .orderBy("id")
        .update({
          value: () => rawUpdate,
        })
        .execute();

      await this.counters.update(
        {
          id,
        },
        {
          last_decay_at: newLastDecayDate,
        },
      );
    });
  }

  async markUnusedTriggersToBeDeleted(triggerIdsToKeep: number[]) {
    let triggersToMarkQuery = this.counterTriggers
      .createQueryBuilder("counterTriggers")
      .innerJoin(Counter, "counters", "counters.id = counterTriggers.counter_id")
      .where("counters.guild_id = :guildId", { guildId: this.guildId });

    // If there are no active triggers, we just mark all triggers from the guild to be deleted.
    // Otherwise, we mark all but the active triggers in the guild.
    if (triggerIdsToKeep.length) {
      triggersToMarkQuery = triggersToMarkQuery.andWhere("counterTriggers.id NOT IN (:...triggerIds)", {
        triggerIds: triggerIdsToKeep,
      });
    }

    const triggersToMark = await triggersToMarkQuery.getMany();

    if (triggersToMark.length) {
      const deleteAt = moment
        .utc()
        .add(DELETE_UNUSED_COUNTER_TRIGGERS_AFTER, "ms")
        .format(DBDateFormat);

      await this.counterTriggers.update(
        {
          id: In(triggersToMark.map(t => t.id)),
        },
        {
          delete_at: deleteAt,
        },
      );
    }
  }

  async deleteTriggersMarkedToBeDeleted(): Promise<void> {
    await this.counterTriggers
      .createQueryBuilder()
      .where("delete_at <= NOW()")
      .delete()
      .execute();
  }

  async initCounterTrigger(
    counterId: number,
    triggerName: string,
    comparisonOp: TriggerComparisonOp,
    comparisonValue: number,
    reverseComparisonOp: TriggerComparisonOp,
    reverseComparisonValue: number,
  ): Promise<CounterTrigger> {
    if (!isValidCounterComparisonOp(comparisonOp)) {
      throw new Error(`Invalid comparison op: ${comparisonOp}`);
    }

    if (!isValidCounterComparisonOp(reverseComparisonOp)) {
      throw new Error(`Invalid comparison op: ${reverseComparisonOp}`);
    }

    if (typeof comparisonValue !== "number") {
      throw new Error(`Invalid comparison value: ${comparisonValue}`);
    }

    if (typeof reverseComparisonValue !== "number") {
      throw new Error(`Invalid comparison value: ${reverseComparisonValue}`);
    }

    return connection.transaction(async entityManager => {
      const existing = await entityManager.findOne(CounterTrigger, {
        counter_id: counterId,
        name: triggerName,
      });

      if (existing) {
        // Since all existing triggers are marked as to-be-deleted before they are re-initialized, this needs to be reset
        await entityManager.update(CounterTrigger, existing.id, {
          comparison_op: comparisonOp,
          comparison_value: comparisonValue,
          reverse_comparison_op: reverseComparisonOp,
          reverse_comparison_value: reverseComparisonValue,
          delete_at: null,
        });
        return existing;
      }

      const insertResult = await entityManager.insert(CounterTrigger, {
        counter_id: counterId,
        name: triggerName,
        comparison_op: comparisonOp,
        comparison_value: comparisonValue,
        reverse_comparison_op: reverseComparisonOp,
        reverse_comparison_value: reverseComparisonValue,
      });

      return (await entityManager.findOne(CounterTrigger, insertResult.identifiers[0].id))!;
    });
  }

  /**
   * Checks if a counter value with the given parameters triggers the specified comparison for the specified counter.
   * If it does, mark this comparison for these parameters as triggered.
   * Note that if this comparison for these parameters was already triggered previously, this function will return false.
   * This means that a specific comparison for the specific parameters specified will only trigger *once* until the reverse trigger is triggered.
   *
   * @param counterId
   * @param comparisonOp
   * @param comparisonValue
   * @param userId
   * @param channelId
   * @return Whether the given parameters newly triggered the given comparison
   */
  async checkForTrigger(
    counterTrigger: CounterTrigger,
    channelId: string | null,
    userId: string | null,
  ): Promise<boolean> {
    channelId = channelId || "0";
    userId = userId || "0";

    return connection.transaction(async entityManager => {
      const previouslyTriggered = await entityManager.findOne(CounterTriggerState, {
        trigger_id: counterTrigger.id,
        user_id: userId!,
        channel_id: channelId!,
      });

      if (previouslyTriggered) {
        return false;
      }

      const matchingValue = await entityManager
        .createQueryBuilder(CounterValue, "cv")
        .leftJoin(
          CounterTriggerState,
          "triggerStates",
          "triggerStates.trigger_id = :triggerId AND triggerStates.user_id = cv.user_id AND triggerStates.channel_id = cv.channel_id",
          { triggerId: counterTrigger.id },
        )
        .where(`cv.value ${counterTrigger.comparison_op} :value`, { value: counterTrigger.comparison_value })
        .andWhere(`cv.counter_id = :counterId`, { counterId: counterTrigger.counter_id })
        .andWhere("cv.channel_id = :channelId AND cv.user_id = :userId", { channelId, userId })
        .andWhere("triggerStates.id IS NULL")
        .getOne();

      if (matchingValue) {
        await entityManager.insert(CounterTriggerState, {
          trigger_id: counterTrigger.id,
          user_id: userId!,
          channel_id: channelId!,
        });

        return true;
      }

      return false;
    });
  }

  /**
   * Checks if any counter values of the specified counter match the specified comparison.
   * Like checkForTrigger(), this can only happen *once* per unique counter value parameters until the reverse trigger is triggered for those values.
   *
   * @return Counter value parameters that triggered the condition
   */
  async checkAllValuesForTrigger(
    counterTrigger: CounterTrigger,
  ): Promise<Array<{ channelId: string; userId: string }>> {
    return connection.transaction(async entityManager => {
      const matchingValues = await entityManager
        .createQueryBuilder(CounterValue, "cv")
        .leftJoin(
          CounterTriggerState,
          "triggerStates",
          "triggerStates.trigger_id = :triggerId AND triggerStates.user_id = cv.user_id AND triggerStates.channel_id = cv.channel_id",
          { triggerId: counterTrigger.id },
        )
        .where(`cv.value ${counterTrigger.comparison_op} :value`, { value: counterTrigger.comparison_value })
        .andWhere(`cv.counter_id = :counterId`, { counterId: counterTrigger.counter_id })
        .andWhere("triggerStates.id IS NULL")
        .getMany();

      if (matchingValues.length) {
        await entityManager.insert(
          CounterTriggerState,
          matchingValues.map(row => ({
            trigger_id: counterTrigger.id,
            channel_id: row.channel_id,
            user_id: row.user_id,
          })),
        );
      }

      return matchingValues.map(row => ({
        channelId: row.channel_id,
        userId: row.user_id,
      }));
    });
  }

  /**
   * Checks if a counter value with the given parameters *no longer* matches the specified comparison, and thus triggers a "reverse trigger".
   * Like checkForTrigger(), this can only happen *once* until the comparison is triggered normally again.
   *
   * @param counterId
   * @param comparisonOp
   * @param comparisonValue
   * @param userId
   * @param channelId
   * @return Whether the given parameters triggered a reverse trigger for the given comparison
   */
  async checkForReverseTrigger(
    counterTrigger: CounterTrigger,
    channelId: string | null,
    userId: string | null,
  ): Promise<boolean> {
    channelId = channelId || "0";
    userId = userId || "0";

    return connection.transaction(async entityManager => {
      const matchingValue = await entityManager
        .createQueryBuilder(CounterValue, "cv")
        .innerJoin(
          CounterTriggerState,
          "triggerStates",
          "triggerStates.trigger_id = :triggerId AND triggerStates.user_id = cv.user_id AND triggerStates.channel_id = cv.channel_id",
          { triggerId: counterTrigger.id },
        )
        .where(`cv.value ${counterTrigger.reverse_comparison_op} :value`, {
          value: counterTrigger.reverse_comparison_value,
        })
        .andWhere(`cv.counter_id = :counterId`, { counterId: counterTrigger.counter_id })
        .andWhere(`cv.channel_id = :channelId AND cv.user_id = :userId`, { channelId, userId })
        .getOne();

      if (matchingValue) {
        await entityManager.delete(CounterTriggerState, {
          trigger_id: counterTrigger.id,
          user_id: userId!,
          channel_id: channelId!,
        });

        return true;
      }

      return false;
    });
  }

  /**
   * Checks if any counter values of the specified counter *no longer* match the specified comparison, and thus triggers a "reverse trigger" for those values.
   * Like checkForTrigger(), this can only happen *once* per unique counter value parameters until the comparison is triggered normally again.
   *
   * @return Counter value parameters that triggered a reverse trigger
   */
  async checkAllValuesForReverseTrigger(
    counterTrigger: CounterTrigger,
  ): Promise<Array<{ channelId: string; userId: string }>> {
    return connection.transaction(async entityManager => {
      const matchingValues: Array<{
        id: string;
        triggerStateId: string;
        user_id: string;
        channel_id: string;
      }> = await entityManager
        .createQueryBuilder(CounterValue, "cv")
        .innerJoin(
          CounterTriggerState,
          "triggerStates",
          "triggerStates.trigger_id = :triggerId AND triggerStates.user_id = cv.user_id AND triggerStates.channel_id = cv.channel_id",
          { triggerId: counterTrigger.id },
        )
        .where(`cv.value ${counterTrigger.reverse_comparison_op} :value`, {
          value: counterTrigger.reverse_comparison_value,
        })
        .andWhere(`cv.counter_id = :counterId`, { counterId: counterTrigger.counter_id })
        .select([
          "cv.id AS id",
          "cv.user_id AS user_id",
          "cv.channel_id AS channel_id",
          "triggerStates.id AS triggerStateId",
        ])
        .getRawMany();

      if (matchingValues.length) {
        await entityManager.delete(CounterTriggerState, {
          id: In(matchingValues.map(v => v.triggerStateId)),
        });
      }

      return matchingValues.map(row => ({
        channelId: row.channel_id,
        userId: row.user_id,
      }));
    });
  }

  async getCurrentValue(
    counterId: number,
    channelId: string | null,
    userId: string | null,
  ): Promise<number | undefined> {
    const value = await this.counterValues.findOne({
      where: {
        counter_id: counterId,
        channel_id: channelId || "0",
        user_id: userId || "0",
      },
    });

    return value?.value;
  }

  async resetAllCounterValues(counterId: number): Promise<void> {
    // Foreign keys will remove any related triggers and counter values
    await this.counters.delete({
      id: counterId,
    });
  }
}
