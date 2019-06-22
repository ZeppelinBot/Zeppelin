<template>
	<a v-bind:href="env.API_URL + '/auth/login'">Login</a>
</template>

<script>
	export default {

      computed: {
        blah() {
          return this.$state.apiKey;
        }
      }
	};
</script>
