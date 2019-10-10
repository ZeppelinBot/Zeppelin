<template>
  <div class="markdown-block" ref="rendered"></div>
</template>

<script>
  import marked from "marked";
  import hljs from "highlight.js";

  export default {
    props: ["content"],
    methods: {
      renderContent() {
        const rendered = marked(this.content || "");
        const target = this.$refs.rendered;
        target.innerHTML = rendered;
        target.querySelectorAll("code[class*='language-']").forEach(elem => {
          if (elem.parentNode.tagName === 'PRE') {
            elem.parentNode.classList.add('codeblock');
          }

          hljs.highlightBlock(elem);
        });
      }
    },
    mounted() {
      this.renderContent();
    },
    watch: {
      content() {
        this.renderContent();
      },
    },
  };
</script>
