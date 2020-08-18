<template>
  <div class="privacy-policy">
    <div class="wrapper">
      <h1>Zeppelin Privacy Policy</h1>

      <h2>Zeppelin overview</h2>
      <p>
        Zeppelin is a moderation bot for Discord that allows server staff to
        carry out moderator actions (warn, mute, kick, ban, clean messages, view
        user information, etc.),
        keep records of infractions, perform automated actions ("automod", e.g.
        message filtering), post detailed logs on logging channels, and set up
        systems such as reaction roles.
        The bot also includes a web dashboard that server administrators can log
        in to through Discord OAuth.
      </p>
      <p>
        The bot's source code is available at
        <a href="https://github.com/Dragory/ZeppelinBot">
          https://github.com/Dragory/ZeppelinBot
        </a>
      </p>

      <h2>Stored data</h2>
      <p>
        When Zeppelin is used by a server, the following categories data can be
        stored by the bot.
        The specific categories of data saved for each server depends on how the
        server has configured Zeppelin.
      </p>
      <ul>
        <li>Recent messages and username/nickname changes of users engaged on
          the server
        </li>
        <li>Recent bulk deleted messages</li>
        <li>Basic user information, moderator-entered text, and relevant message
          archives for infraction records
        </li>
        <li>A subset of previously held roles and nickname on the server to be
          restored when a user rejoins
        </li>
        <li>Basic server details of the server using the bot</li>
      </ul>
      <p>
        Additionally, when a user logs in to the web dashboard the following
        types of data are stored:
      </p>
      <ul>
        <li>Basic Discord user information</li>
        <li>Time and originating IP address of the login for security audit
          purposes
        </li>
      </ul>

      <h2>Data retention</h2>
      <ul>
        <li>
          Recent messages are stored for 24h
          <ul>
            <li>Deleted messages within this 24h are cleared 5 minutes after
              deletion
            </li>
          </ul>
        </li>
        <li>5 most recent usernames and 10 most recent nicknames of users
          engaged in chat or voice channels are stored for 30 days
        </li>
        <li>Archives of bulk-deleted messages are stored for 30 days</li>
        <li>Infraction record data is kept until the server stops using Zeppelin
          unless explicitly deleted
        </li>
        <li>Roles and nicknames that are restored on rejoin are cleared when the
          user rejoins
        </li>
        <li>User information for users logged in to the bot's web dashboard via
          Discord OAuth is stored as long as the server uses Zeppelin
        </li>
      </ul>

      <h2>Data access and deletion requests</h2>
      <p>
        To request access to personal data stored about you, or to request its
        deletion, to the extent permitted by GDPR, please send an email to <a
        href="mailto:contact@mivir.fi">contact@mivir.fi</a>.
      </p>
    </div></div>
</template>

<script type="ts">
  import "../style/privacy-policy.pcss";
  export default {};
</script>
