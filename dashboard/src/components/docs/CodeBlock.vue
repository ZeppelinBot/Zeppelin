<template>
  <pre class="codeblock" v-highlightjs><code :class="codeLang" v-trim-indents="trim"><slot></slot></code></pre>
</template>

<script>
  export default {
    props: ["codeLang", "trim"],
  };
</script>
