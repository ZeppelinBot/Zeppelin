<template>
  <div class="expandable mb-4 bg-gray-800 border border-gray-600 rounded overflow-hidden"
       ref="root"
       v-bind:class="{ 'shadow-xl': isOpen}">
    <div role="button"
         class="title p-2 focus:bg-gray-700"
         v-on:click="toggle"
         v-on:keydown.space="$event.preventDefault()"
         v-on:keyup.space="toggle"
         tabindex="0">
      <chevron-down decorative class="icon" v-bind:class="{'icon-open': isOpen}" />
      <span class="title-text"><slot name="title"></slot></span>
    </div>
    <div class="content border-t border-gray-700" ref="content">
      <div class="p-4 pb-0">
        <slot name="content"></slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
  @import "../style/components.pcss";

  .expandable {
    --animation-time: 400ms;
    --target-height: auto;
    transition: box-shadow var(--animation-time); /* hi */

    & > .title {
      &:hover {
        & .title-text {
          @apply underline;
        }
      }

      & .icon {
        transition: transform var(--animation-time);
        transform-origin: 50% 50%;
        position: relative;
        top: 0.125rem;
      }

      & .icon-open {
        transform: rotate(179deg);
      }
    }

    & > .content {
      overflow: hidden;
      display: none;
    }
  }

  @keyframes open {
    0% { height: 0; }
    100% { height: var(--target-height); }
  }

  @keyframes close {
    100% { height: 0; }
    0% { height: var(--target-height); }
  }

  .opening {
    animation: open var(--animation-time) ease-in-out;
  }

  .closing {
    animation: close var(--animation-time) ease-in-out;
  }

  .inline-code,
  code:not([class]),
  >>> code:not([class]) {
    @apply bg-gray-900;
  }

  .codeblock {
    box-shadow: none;
  }
</style>

<script type="ts">
  import ChevronDown from 'vue-material-design-icons/ChevronDown.vue';

  const ANIMATION_TIME = 400;

  export default {
    components: { ChevronDown },
    mounted() {
      this.$refs.root.style.setProperty('--animation-time', `${ANIMATION_TIME}ms`);
    },
    data() {
      return {
        isOpen: false,
        animating: false,
      };
    },
    methods: {
      toggle() {
        if (this.isOpen) this.close();
        else this.open();
      },
      open() {
        if (this.animating) return;
        this.animating = true;
        this.isOpen = true;

        this.$refs.content.style.display = 'block';
        const targetHeight = this.$refs.content.clientHeight;
        this.$refs.content.style.setProperty('--target-height', `${targetHeight}px`);
        this.$refs.content.classList.add('opening');

        setTimeout(() => {
          this.$refs.content.classList.remove('opening');
          this.animating = false;
        }, ANIMATION_TIME);
      },
      close() {
        if (this.animating) return;
        this.animating = true;
        this.isOpen = false;

        const targetHeight = this.$refs.content.clientHeight;
        this.$refs.content.style.setProperty('--target-height', `${targetHeight}px`);
        this.$refs.content.classList.add('closing');

        setTimeout(() => {
          this.$refs.content.classList.remove('closing');
          this.$refs.content.style.display = 'none';
          this.animating = false;
        }, ANIMATION_TIME);
      },
    },
  };
</script>
