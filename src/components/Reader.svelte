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

  let cursor_mode = "pointer";
  let view_mode = "continuous";
  const handleKeys = (e) => {
    // Disregard if modifier key is held down
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    console.log(e);
    // console.log(diff, pageIdx);
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      imageContainer.scrollLeft -= 50;
    }

    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      imageContainer.scrollLeft += 50;
    }
    if (e.key === "h" || e.key === "H") {
      cursor_mode = "hand";
    }
    if (e.key === "v" || e.key === "v") {
      cursor_mode = "pointer";
    }
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

  // Initial mouse courdinates if dragging
  let initMouseCoords = null;
  const handleImgDragStart = (e) => {
    if (cursor_mode === "pointer") return e.preventDefault();
  };
  const handleMouseDown = (e) => {
    if (initMouseCoords) return;
    if (e.buttons & 1)
      initMouseCoords = {
        x: e.clientX,
        y: e.clientY,
        scrollLeft: imageContainer.scrollLeft,
      };
  };
  const handleMouseUp = (e) => {
    if (e.buttons & 1) return;
    initMouseCoords = null;
  };
  const handleMouseMove = (e) => {
    if (!initMouseCoords) return;
    const { x, scrollLeft } = initMouseCoords;
    if (cursor_mode === "pointer") {
      // console.log(e.clientX - x, e.clientY - y);
      imageContainer.scrollLeft = scrollLeft - (e.clientX - x);
    }
  };

  onMount(() => {
    new Sortable(imageContainer, {
      animation: 150,
      filter: ".side-pane",
    });
  });

  let showSidePane = false;
  const handlePageNumberInputFocus = (e) => {
    e.target.select();
    showSidePane = true;
  };
  const handlePageNumberInputBlur = (e) => {
    showSidePane = false;
  };
</script>

<svelte:window on:keydown={handleKeys} />

<svelte:head>
  <title>Simpler Days − {file.name}</title>
</svelte:head>

<div
  class="main-container"
  bind:this={imageContainer}
  on:wheel={handleWheel}
  on:scroll={handlePageScroll}
  class:hand={cursor_mode === "hand"}
  draggable="false"
  on:mousedown={handleMouseDown}
  on:mouseup={handleMouseUp}
  on:mousemove={handleMouseMove}
>
  {#await getPages() then pages}
    {#each pages as page, i}
      {#await createPageURL(page) then objectURL}
        <img
          src={objectURL}
          on:load={() => URL.revokeObjectURL(objectURL)}
          alt="page"
          bind:this={imageElems[i]}
          draggable="false"
          on:dragstart={handleImgDragStart}
        />
      {/await}
    {/each}
  {/await}
</div>
<div class="side-pane" class:show={showSidePane}>
  <div class="page-indicator">
    <input
      id="page-number"
      class="page-number"
      type="text"
      value={current_page + 1}
      on:input={handlePageNumberInput}
      on:focus={handlePageNumberInputFocus}
      on:blur={handlePageNumberInputBlur}
    />
    <div class="total-pages default-hide">/{loadCount}</div>
  </div>
  <div class="action-col default-hide">
    <div
      class="icon-wrap"
      class:active={cursor_mode === "pointer"}
      on:click={() => (cursor_mode = "pointer")}
    >
      <img src="images/pointer.svg" alt="Normal cursor" />
    </div>
    <div
      class="icon-wrap"
      class:active={cursor_mode === "hand"}
      on:click={() => (cursor_mode = "hand")}
    >
      <img src="images/hand.svg" alt="Hand cursor" />
    </div>
    <div class="separator" />
    <div class="icon-wrap">
      <img src="images/twopage.svg" alt="Two page mode" />
    </div>
    <div class="icon-wrap" class:active={view_mode === "continuous"}>
      <img src="images/continuous.svg" alt="Continuous page mode" />
    </div>
    <div class="icon-wrap">
      <img src="images/singlepage.svg" alt="Single page mode" />
    </div>
  </div>
</div>

<style>
  .main-container {
    display: flex;
    height: 100vh;
    overflow-x: scroll;
    gap: 10px;
  }
  .main-container.hand {
    cursor: grab;
  }
  .side-pane {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    color: var(--medium);
    background-color: transparent;
    font-family: Coolvetica;
    position: fixed;
    top: 0;
    bottom: 0;
    right: 0;
    width: 60px;
    transition: all 0.1s ease;
    cursor: default;
  }
  .side-pane:hover,
  .side-pane.show {
    background-color: var(--whitish);
  }

  .side-pane .default-hide {
    opacity: 0;
    transition: all 0.1s ease;
  }
  .side-pane:hover .default-hide,
  .side-pane.show .default-hide {
    opacity: 1;
  }

  .page-indicator {
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

  .action-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px 0;
    gap: 4px;
  }

  .action-col .separator {
    display: flex;
    justify-content: center;
    width: 100%;
    padding: 6px 0;
  }
  .action-col .separator::after {
    content: "";
    width: 60%;
    height: 3px;
    border-radius: 3px;
    background-color: var(--medium);
  }

  .action-col .icon-wrap {
    width: 100%;
    display: flex;
    justify-content: center;
    padding: 4px 0;
    user-select: none;
    height: 50px;
  }

  .action-col .icon-wrap.active,
  .action-col .icon-wrap:hover {
    background-color: #3627240f;
  }

  .action-col img {
    width: 18px;
  }

  img {
    height: 100%;
    object-fit: contain;
    user-select: none;

    /* Fix for Chrome's blurry downscaling of images */
    image-rendering: -webkit-optimize-contrast;
  }
</style>
