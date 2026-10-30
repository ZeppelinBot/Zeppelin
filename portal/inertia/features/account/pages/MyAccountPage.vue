<template>
  <MainLayout :max-width-step="20">
    <ContentPaper>
      <h1>Account</h1>
      <p>
        You are currently logged in as <strong>{{ page.props.user?.discordUsername }}</strong> (id
        {{ page.props.user?.discordUserId }}).
      </p>
      <h2>Your data</h2>
      <p>To see details about Zeppelin's data processing, please see the privacy policy.</p>
      <h3>Download a copy of your data</h3>
      <p>
        Press the button below to download a copy of data that is stored against your Discord user in Zeppelin.
        <br /><br />
        This will only include data controlled directly by Zeppelin staff. For data controlled by servers, such as your
        case history, please contact the relevant servers. The data archive includes a list of servers that are
        processing data about you.
      </p>
      <DataExportDownload
        start-url="/account/download-data"
        :filename="`export-${page.props.user?.discordUserId}.zip`"
      />
      <h3>Delete your data</h3>
      <p>
        Press the button below to delete data stored against your Discord user in Zeppelin.
        <br /><br />
        This will only include data controlled directly by Zeppelin staff. For data controlled by servers, such as your
        case history, please contact the relevant servers. You can see a list of servers processing data about you by
        downloading a copy of your account data above.
      </p>
      <Form route="account.post_delete_my_account_data" @before="confirmDataDeletion">
        <p>
          <BasicButton theme="danger">
            <button type="submit">Delete account data</button>
          </BasicButton>
          <br /><br />
          Please note that it can take up to a minute to delete your data after clicking the button.
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
import { usePage } from "@inertiajs/vue3";

const page = usePage();

function confirmDataDeletion() {
  return window.confirm(
    "Are you sure you want to delete your account data? This cannot be undone. Make sure to download a copy of your data first.",
  );
}
</script>
