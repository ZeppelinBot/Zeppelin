<template>
  <pre class="codeblock"><code :class="codeLang" v-trim-indents="trim" v-highlightjs><slot></slot></code></pre>
</template>

<script>
  export default {
    props: ["codeLang", "trim"],
  };
</script>
