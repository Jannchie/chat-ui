<script setup lang="ts">
import { RokuProvider } from '@roku-ui/vue'
import { loadShiki } from './utils'

loadShiki()
</script>

<template>
  <RokuProvider>
    <RouterView />
  </RokuProvider>
</template>

<style>
:root {
  font-family: "harmonyos sans SC", "Noto Sans SC", sans-serif;
  font-optical-sizing: auto;
  font-style: normal;
  color-scheme: dark light;
  background-color: #1e1e1f !important;
}

.input-section:before {
    content: "";
    position: absolute;
    top: -50px;
    width: 100%;
    height: 100px;
    pointer-events: none;
    background: -webkit-gradient(linear,left top,left bottom,from(#13131400),color-stop(60%,#131314));
    background: -webkit-linear-gradient(top,#13131400,#131314 60%);
    background: linear-gradient(180deg,#13131400,#131314 60%);
}
pre {
  outline: none;
}

.input-enter-animate {
  animation: inputEnter 0.5s forwards;
}
.animate-fade-delay {
  opacity: 0;
  animation: fade 0.5s forwards 0.2s;
}

textarea::-moz-placeholder {
  white-space: nowrap;
}

textarea::-webkit-placeholder {
  white-space: nowrap;
}

textarea::placeholder {
  white-space: nowrap;
}

.gradient-text {
  --gradient-color-1: #004183;
  --gradient-color-2: #0a57a5;
  --gradient-color-3: #c71d86;
  background: linear-gradient(74deg, var(--gradient-color-1), var(--gradient-color-2), var(--gradient-color-3), var(--gradient-color-3), var(--gradient-color-2), var(--gradient-color-1), var(--gradient-color-2), var(--gradient-color-3), rgba(0, 0, 0, 0), rgba(0, 0, 0, 0));
  background-size: 400% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  display: inline-block;
  animation: gradient-animation 2s forwards;
}

@keyframes gradient-animation {
  0% {
    background-position: 100% 0%;
    background-size: 800% 100%;
  }
  100% {
    background-position: 0% 0%;
    background-size: 400% 100%;
  }
}

@keyframes inputEnter {
  from {
    opacity: 0;
    width: 50%;
    translate: 25% 0%;
  }
  to {
    opacity: 1;
    width: 100%;
    translate: 0% 0%;
  }
}

@keyframes fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>

<style>
.fade-enter-active {
  transition: opacity 1s;
}

.fade-leave-active {
  position: absolute;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
.fade-enter-to, .fade-leave-from {
  opacity: 1;
}
p {
  white-space: pre-wrap;
}
.line {
  transition: opacity 0.5s;
}

.fade-in {
    opacity: 0;
    animation: fadeIn 1s forwards;
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}
</style>
