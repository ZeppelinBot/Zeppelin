<template>
  <MainLayout :max-width-step="20">
    <ContentPaper>
      <h1>Account</h1>
      <p>Managing account data for user ID {{ props.userId }}</p>
      <h2>Account data</h2>
      <DataExportDownload
        :start-url="`/specific-account/${props.userId}/download-data`"
        :filename="`export-${props.userId}.zip`"
      />
      <h3>Delete account data</h3>
      <Form
        route="account.post_delete_specific_account_data"
        :params="{ userId: props.userId }"
        @before="confirmDataDeletion"
      >
        <p>
          <BasicButton theme="danger">
            <button type="submit">Delete account data</button>
          </BasicButton>
        </p>
      </Form>
    </ContentPaper>
  </MainLayout>
</template>

<script setup lang="ts">
import BasicButton from "#frontend/components/BasicButton.vue";
import DataExportDownload from "#frontend/features/account/components/DataExportDownload.vue";
import ContentPaper from "#frontend/features/layout/ContentPaper.vue";
import MainLayout from "#frontend/features/layout/MainLayout.vue";
import { Form } from "@adonisjs/inertia/vue";

const props = defineProps({
  userId: {
    type: String,
    required: true,
  },
});

function confirmDataDeletion() {
  return window.confirm(
    `Are you sure you want to delete the account data of user ${props.userId}? This cannot be undone. Make sure to download a copy of their data first.`,
  );
}
</script>
