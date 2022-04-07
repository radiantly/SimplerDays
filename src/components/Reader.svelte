<script>
  import * as zip from "@zip.js/zip.js";
  import Sortable from "sortablejs";
  import { onMount } from "svelte";
  export let file;

  let current_page = 0;

  const reader = new zip.ZipReader(new zip.BlobReader(file));
  const getPages = async () =>
    (await reader.getEntries())
      .filter((entry) => !entry.directory && entry.filename)
      .sort((entry1, entry2) => entry1.filename.localeCompare(entry2.filename));

  const handleKeys = (e) => {
    // console.log(diff, pageIdx);
    // if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
    //   if (current_page) current_page -= 1;
    // }
    // if (e.key === "ArrowRight" || e.key === "ArrowDown") {
    //   if (current_page + 1 < pages.length) {
    //     current_page += 1;
    //   }
    // }
    // last = Date.now();
  };

  let loadCount = 0;
  const createPageURL = async (page) => {
    const pageBlob = await page.getData(new zip.BlobWriter("image/jpeg"), {
      useWebWorkers: true,
    });
    loadCount += 1;
    return URL.createObjectURL(pageBlob);
  };

  let imageContainer;
  const imageElems = [];

  const handlePageNumberInput = (e) => {
    const page_new = parseInt(e.target.value);
    if (Number.isNaN(page_new)) return;
    console.log("Reached here too!");
    if (!imageElems.hasOwnProperty(page_new - 1)) return;
    imageContainer.scrollLeft +=
      imageElems[page_new - 1].getBoundingClientRect().x;
  };

  const handleWheel = (e) => {
    imageContainer.scrollLeft += e.deltaY;
  };
  const handlePageScroll = (e) => {
    const offset = 10;
    let low = 0;
    let high = imageElems.length - 1;
    while (low <= high) {
      const mid = Math.floor(low + (high - low) / 2);
      if (imageElems[mid].getBoundingClientRect().x > offset) high = mid - 1;
      else low = mid + 1;
    }
    current_page = Math.max(0, low - 1);
  };

  onMount(() => {
    new Sortable(imageContainer, {
      animation: 150,
    });
  });
</script>

<svelte:window on:keydown={handleKeys} />

<div
  class="main-container"
  bind:this={imageContainer}
  on:wheel={handleWheel}
  on:scroll={handlePageScroll}
>
  {#await getPages() then pages}
    {#each pages as page, i}
      {#await createPageURL(page) then objectURL}
        <img
          src={objectURL}
          on:load={() => URL.revokeObjectURL(objectURL)}
          alt="page"
          bind:this={imageElems[i]}
        />
      {/await}
    {/each}
  {/await}
</div>
<div class="side-pane">
  <div class="page-indicator">
    <input
      id="page-number"
      class="page-number"
      type="text"
      value={current_page + 1}
      on:input={handlePageNumberInput}
      on:focus={(e) => e.target.select()}
    />
    <div class="total-pages">/{loadCount}</div>
  </div>
</div>

<style>
  .main-container {
    display: flex;
    height: 100vh;
    overflow-x: scroll;
    gap: 10px;
  }
  .side-pane {
    display: flex;
    flex-direction: column;
    color: var(--medium);
    background-color: var(--whitish);
    font-family: Coolvetica;
    position: fixed;
    top: 0;
    bottom: 0;
    right: 0;
    width: 60px;
  }
  .page-indicator {
    align-self: flex-start;
    padding: 20px 0;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .page-number {
    text-align: center;
    border: none;
    background: none;
    outline: none;
    color: var(--medium);
    font-family: Poppins;
    font-weight: 600;
    margin: 0;
    padding: 0;
    font-size: 24px;
    min-width: 0;
    width: 100%;
    cursor: default;
  }
  .page-number:hover {
    background-color: #3627240f;
  }
  .page-number:focus {
    cursor: text;
  }
  .total-pages {
    font-size: 14px;
  }
  img {
    height: 100%;
    object-fit: contain;
  }
</style>
