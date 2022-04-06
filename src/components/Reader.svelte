<script>
  import * as zip from "@zip.js/zip.js";

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
    e.preventDefault();
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
  <label class="page-indicator" for="page-number">
    <input
      id="page-number"
      class="page-number"
      type="text"
      value={current_page + 1}
      on:input={handlePageNumberInput}
    />
    <div class="by">/</div>
    <div class="total-pages">{loadCount}</div>
  </label>
</div>

<style>
  .main-container {
    display: flex;
    height: 100vh;
    overflow-x: scroll;
  }
  .page-indicator {
    position: fixed;
    top: 10px;
    right: 10px;
    color: var(--darkish);
    font-family: Poppins;
    font-weight: 600;
    display: flex;
    font-size: 16px;
  }
  .page-number {
    text-align: right;
    border: none;
    background: none;
    color: var(--darkish);
    font-family: Poppins;
    font-weight: 600;
    margin: 0;
    padding: 0;
    font-size: 16px;
  }
  .total-pages {
    min-width: 30px;
    text-align: left;
  }
  img {
    height: 100%;
    object-fit: contain;
  }
</style>
