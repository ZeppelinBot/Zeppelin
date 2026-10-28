<template>
  <MainLayout :max-width-step="20">
    <ContentPaper>
      <h1>Account</h1>
      <p>
        You are currently logged in as <strong>{{ page.props.user?.username }}</strong> (id {{ page.props.user?.userId }}).
      </p>
      <h2>Your data</h2>
      <p>
        To see details about Zeppelin's data processing, please see the privacy policy.
      </p>
      <h3>Download a copy of your data</h3>
      <p>
        Press the button below to download a copy of data that is stored against your Discord user in Zeppelin.
        <br /><br />
        This will only include data controlled directly by Zeppelin staff.
        For data controlled by servers, such as your case history, please contact the relevant servers.
        You can see a list of servers holding data about you below.
      </p>
      <form method="POST" action="/account/download-data" target="_blank">
        <input type="hidden" name="_csrf" :value="csrfToken" />
        <p>
          <BasicButton>
            <button type="submit">Download account data</button>
          </BasicButton>
        </p>
      </form>
      <h3>Delete your data</h3>
      <p>
        Press the button below to delete data stored against your Discord user in Zeppelin.
        <br /><br />
        This will only include data controlled directly by Zeppelin staff.
        For data controlled by servers, such as your case history, please contact the relevant servers.
        You can see a list of servers holding data about you below.
      </p>
      <Form route="account.post_delete_account_data">
        <p>
          <BasicButton theme="danger">
            <button type="submit">Delete account data</button>
          </BasicButton>
        </p>
      </Form>
      <h3>Servers holding data about you</h3>
    </ContentPaper>
  </MainLayout>
</template>

<script setup lang="ts">
import BasicButton from '#frontend/components/BasicButton.vue';
import ContentPaper from '#frontend/features/layout/ContentPaper.vue';
import MainLayout from '#frontend/features/layout/MainLayout.vue';
import { Form } from '@adonisjs/inertia/vue';
import { usePage } from '@inertiajs/vue3';

const page = usePage();

const csrfToken = document.querySelector<HTMLMetaElement>("meta[name='csrf-token']")?.content ?? "";
</script>
