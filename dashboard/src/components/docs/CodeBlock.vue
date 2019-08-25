<template>
  <pre class="codeblock" v-highlightjs><code :class="lang" v-trim-code="trim"><slot></slot></code></pre>
</template>

<style scoped>
  .codeblock {
    border-radius: 3px;
    padding: 16px;
    max-width: 970px; /* FIXME: temp fix for overflowing code blocks, look into properly later */
  }

  .hljs {
    background: transparent;
    padding: 0;
  }
</style>

<script>
  export default {
    props: ["lang", "trim"],
  };
</script>
