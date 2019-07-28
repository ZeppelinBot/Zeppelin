<template>
  <pre class="codeblock" v-highlightjs><code v-bind:class="lang" v-trim-code="trim"><slot></slot></code></pre>
</template>

<style scoped>
  .codeblock {
    padding: 0;
    border-radius: 3px;
  }

  .hljs {
    background: transparent;
    padding: 16px;
  }
</style>

<script>
  export default {
    props: ["lang", "trim"],
  };
</script>
