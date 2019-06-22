<template>
	<p>Redirecting...</p>
</template>

<script>
	export default {
	  created() {
	    this.$router.push('/login');
	  }
	};
</script>
