<template>
  <pre class="codeblock" v-highlightjs><code :class="lang" v-trim-indents="trim"><slot></slot></code></pre>
</template>

<script>
  export default {
    props: ["lang", "trim"],
  };
</script>
