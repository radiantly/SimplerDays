<script>
  import Hero from "./components/Hero.svelte";
  import Reader from "./components/Reader.svelte";
  let file = null;
</script>

{#if file == null}
  <Hero bind:file />
{:else}
  <Reader bind:file />
{/if}
