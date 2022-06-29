<script>
  import { ZipReader, BlobReader, BlobWriter } from "@zip.js/zip.js";
  import gsap from "gsap";
  import Flip from "gsap/Flip";
  import { onMount } from "svelte";
  export let file;

  gsap.registerPlugin(Flip);

  let rtl = localStorage.getItem("rtl") === "true";
  $: localStorage.setItem("rtl", rtl.toString());

  let current_page = 0;
  $: localStorage.setItem(file.name, current_page.toString());

  let imageContainer;
  const imageElems = [];

  /**
   * Reads the file to return file info and page blobs
   * @param {function({pageCount: int})} initialCallback - called when file has completed inital parsing
   * @param {function({pageBlob: Blob, pageIndex: int})} pageCallback - called for each page
   */
  async function getPageBlobs(initialCallback, pageCallback) {
    if (file.name.slice(-1) == "r") {
      // .cbr
      const worker = new Worker(new URL("../rar-worker.js", import.meta.url));
      worker.addEventListener(
        "message",
        ({ data }) => {
          initialCallback(data);
          worker.addEventListener("message", ({ data }) => pageCallback(data));
        },
        { once: true }
      );

      worker.postMessage({ file });
    } else {
      // .cbz
      const blobs = (await new ZipReader(new BlobReader(file)).getEntries())
        .filter((entry) => !entry.directory && entry.filename)
        .sort((entry1, entry2) =>
          entry1.filename.localeCompare(entry2.filename)
        )
        .map((entry) =>
          entry.getData(new BlobWriter(), {
            useWebWorkers: true,
          })
        );
      initialCallback({ pageCount: blobs.length });
      let pageIndex = 0;
      for (const blob of blobs)
        pageCallback({ pageBlob: await blob, pageIndex: pageIndex++ });
    }
  }

  let topLoadIndicatorElem;
  onMount(async () => {
    gsap.set(topLoadIndicatorElem, {
      scaleX: 0,
      transformOrigin: "left center",
    });
    const fragment = document.createDocumentFragment();
    let loaded = 0;
    const addImages = () => {
      if (fragment.childElementCount) {
        imageContainer.appendChild(fragment);
      }

      if (loaded < imageElems.length) {
        setTimeout(addImages, 112);
      } else {
        gsap.to(topLoadIndicatorElem, {
          scaleX: 0,
          startAt: { transformOrigin: "right center" },
        });
      }
    };

    const handleFileParse = ({ pageCount }) => {
      imageElems.push(...Array(pageCount));
      addImages();
    };

    const handlePageParse = ({ pageBlob, pageIndex }) => {
      const image = new Image();
      image.addEventListener("load", (e) => URL.revokeObjectURL(e.target.src), {
        once: true,
      });
      image.src = URL.createObjectURL(pageBlob);
      image.draggable = false;
      image.addEventListener("dragstart", (e) => e.preventDefault());
      image.setAttribute("data-page", pageIndex);
      image.style.order = pageIndex.toString();
      fragment.appendChild(image);
      imageElems[pageIndex] = image;
      gsap.to(topLoadIndicatorElem, {
        scaleX: ++loaded / imageElems.length,
      });
    };

    getPageBlobs(handleFileParse, handlePageParse);
  });

  let cursor_mode = "pointer";
  let view_mode = "continuous_horizontal";

  // Scroll viewport to the page specified
  const goToPage = (page_index) => {
    if (!imageElems.hasOwnProperty(page_index)) return;
    const bounds = imageElems[page_index].getBoundingClientRect();
    imageContainer.scrollLeft += rtl
      ? bounds.right - window.innerWidth
      : bounds.left;
  };

  const handleKeys = (e) => {
    // Disregard if modifier key is held down
    if (e.altKey || e.ctrlKey || e.metaKey) return;

    console.log(e.key);
    if (["ArrowLeft", "ArrowRight"].includes(e.key)) {
      imageContainer.scrollLeft += e.key === "ArrowRight" ? 50 : -50;
    } else if (["ArrowUp", "ArrowDown"].includes(e.key)) {
      imageContainer.scrollLeft +=
        (!rtl && e.key === "ArrowUp") || (rtl && e.key === "ArrowDown")
          ? -50
          : 50;
    } else if (e.key === "h" || e.key === "H") {
      cursor_mode = "hand";
    } else if (e.key === "v" || e.key === "v") {
      cursor_mode = "pointer";
    } else if (e.key === "PageUp") {
      goToPage(current_page - 1);
    } else if (e.key === "PageDown") {
      goToPage(current_page + 1);
    }
  };

  const handlePageNumberInput = (e) => {
    const page_new = parseInt(e.target.value);
    if (Number.isNaN(page_new)) return;
    goToPage(page_new - 1);
  };

  // properties related to mouse drag
  let dragProps = null;

  // Handle the mouse wheel event to convert vertical scrolling to horizontal scrolling
  const handleWheel = (e) => {
    const initialScroll = imageContainer.scrollLeft;
    imageContainer.scrollLeft += rtl ? -e.deltaY : e.deltaY;
    const delta = imageContainer.scrollLeft - initialScroll;

    // If the mouse is currently pressed, accordingly update internal initial values
    if (dragProps) {
      if (dragProps.node) {
        // in hand moode
        dragProps.x -= delta;
        dragProps.setNodeOffsetX(e.clientX - dragProps.x);
      } else {
        // in pointer mode
        dragProps.x += delta;
      }
    }
  };

  // Update current page number when scrolled
  const handlePageScroll = (e) => {
    // Offset in px from the side
    const offset = 10;

    // Binary search FTW
    let low = 0;
    let high = imageElems.length - 1;
    while (low <= high) {
      const mid = Math.floor(low + (high - low) / 2);
      const bounds = imageElems[mid].getBoundingClientRect();
      const position = rtl ? window.innerWidth - bounds.right : bounds.left; // Account for RTL
      if (position > offset) high = mid - 1;
      else low = mid + 1;
    }
    current_page = Math.max(0, low - 1);
  };

  const isPrimaryMouseButtonPressed = (mouseEvent) => mouseEvent.buttons & 1;
  const isMiddleMouseButtonPressed = (mouseEvent) => mouseEvent.buttons & 4;

  // Handle clicking and dragging
  const handleMouseDown = (e) => {
    // If we already have drag info, then ignore event
    // (this happens when a MouseDown event occurs, but there is no subsequent MouseUp)
    // For example, when the cursor is released outside the page.
    if (dragProps) return;

    if (!isPrimaryMouseButtonPressed(e) && !isMiddleMouseButtonPressed(e))
      return;

    // Store initial mouse positions and how much the parent container is scrolled
    dragProps = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: imageContainer.scrollLeft,
    };

    // In hand mode, also store the element we're dragging and set related classes
    if (isMiddleMouseButtonPressed(e)) {
      if (!e.target.dataset.page) return;
      cursor_mode = "hand";
      dragProps.node = e.target;
      dragProps.setNodeOffsetX = gsap.quickSetter(dragProps.node, "x", "px");
      dragProps.node.classList.add("dragged", "pointer-events-none");
    }
  };

  const handleMouseUp = (e) => {
    if (cursor_mode == "pointer" && isPrimaryMouseButtonPressed(e)) return;
    if (cursor_mode == "hand" && isMiddleMouseButtonPressed(e)) return;

    // (In hand mode)
    // Move dragged element to original position reset classes
    if (dragProps?.node) {
      // Get a reference to the dragged node to use later
      const draggedNode = dragProps.node;
      gsap.to(draggedNode, {
        x: 0,
        duration: 0.2,
        onComplete: () => draggedNode.classList.remove("dragged"),
      });
      dragProps.node.classList.remove("pointer-events-none");
    }

    dragProps = null;
    cursor_mode = "pointer";
  };

  const handleMouseMove = (e) => {
    // Ignore if no initial drag properties set
    if (!dragProps) return;
    // In pointer mode, change the container's scroll amount by how much the mouse has been dragged
    if (cursor_mode === "pointer") {
      const { x, scrollLeft } = dragProps;
      imageContainer.scrollLeft = scrollLeft - (e.clientX - x);
    } else if (cursor_mode === "hand" && dragProps.node) {
      // In hand mode, check what the current page is being dragged over
      const over = document.elementFromPoint(e.clientX, e.clientY);

      // If a page, let's swap
      if (over.dataset.page) {
        // Before swap, get the x position and record state
        const currentDraggedX = dragProps.node.getBoundingClientRect().x;
        const state = Flip.getState(over, { simple: true });

        // Swap pages
        [dragProps.node.style.order, over.style.order] = [
          over.style.order,
          dragProps.node.style.order,
        ];

        // Once swapped, play swap animation using FLIP technique
        Flip.from(state, {
          duration: 0.2,
          toggleClass: "flip-page",
        });

        // Swap in imageElems array
        const i = parseInt(dragProps.node.dataset.page);
        const j = parseInt(over.dataset.page);
        [imageElems[i], imageElems[j]] = [imageElems[j], imageElems[i]];

        // Swap data attrs themselves
        dragProps.node.dataset.page = j.toString();
        over.dataset.page = i.toString();

        // Also change dragProps to new values so that dragged page does not jump around awkwardly
        const newDraggedX = dragProps.node.getBoundingClientRect().x;
        dragProps.x += newDraggedX - currentDraggedX;
      }
      // Finally update
      dragProps.setNodeOffsetX(e.clientX - dragProps.x);
    }
  };

  let showSidePane = false;
  const handlePageNumberInputFocus = (e) => {
    e.target.select();
    showSidePane = true;
  };
  const handlePageNumberInputBlur = (e) => {
    showSidePane = false;
  };

  const handleRTLClick = () => {
    setTimeout(goToPage, 0, current_page);
    rtl = !rtl;
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
  class:rtl
  draggable="false"
  on:mousedown={handleMouseDown}
  on:mouseup={handleMouseUp}
  on:mousemove={handleMouseMove}
/>
<div class="top-load-indicator" bind:this={topLoadIndicatorElem} />
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
    <div class="total-pages default-hide">/{imageElems.length}</div>
  </div>
  <div class="action-col default-hide">
    <div class="icon-wrap rtl" on:click={handleRTLClick}>
      {rtl ? "LTR" : "RTL"}
    </div>
    <!-- This block can be uncommented once the various page modes have been implemented -->
    <!-- <div class="separator" />
    <div class="icon-wrap">
      <img
        draggable="false"
        src="images/singlepage.svg"
        alt="Single page mode"
      />
    </div>
    <div class="icon-wrap">
      <img draggable="false" src="images/twopage.svg" alt="Two page mode" />
    </div>
    <div class="icon-wrap" class:active={view_mode === "continuous_horizontal"}>
      <img
        draggable="false"
        src="images/continuous-horizontal.svg"
        alt="Continuous page mode"
      />
    </div>
    <div class="icon-wrap" class:active={view_mode === "continuous_vertical"}>
      <img
        draggable="false"
        src="images/continuous-vertical.svg"
        alt="Continuous page mode"
      />
    </div> -->
  </div>
</div>

<style>
  .main-container {
    display: flex;
    height: 100vh;
    overflow-x: scroll;
    gap: 10px;
  }
  .main-container.rtl {
    flex-direction: row-reverse;
  }
  .main-container.hand {
    cursor: grab;
  }
  .top-load-indicator {
    position: fixed;
    width: 100%;
    top: 0;
    left: 0;
    height: 4px;
    background-color: var(--red);
    z-index: 999;
    box-shadow: 1px 1px 12px 4px rgb(188 48 47 / 10%);
    border-radius: 0 15px 15px 0;
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
    z-index: 1337;
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

  /* .action-col .separator {
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
  } */

  .action-col .icon-wrap {
    width: 100%;
    display: flex;
    justify-content: center;
    user-select: none;
    height: 45px;
  }

  /* .action-col .icon-wrap.active, */
  .action-col .icon-wrap:hover {
    background-color: #3627240f;
  }

  .action-col .icon-wrap.rtl {
    font-family: Coolvetica Condensed;
    align-items: center;
    font-size: 1.5rem;
  }

  /* .action-col img {
    width: 18px;
  } */

  .main-container :global(img) {
    height: 100%;
    object-fit: contain;
    user-select: none;
    z-index: 10;

    /* Fix for Chrome's blurry downscaling of images */
    image-rendering: -webkit-optimize-contrast;
  }

  .main-container :global(img.flip-page) {
    pointer-events: none;
    z-index: 4;
  }
  .main-container :global(img.dragged) {
    z-index: 42;
  }

  .main-container :global(img.pointer-events-none) {
    pointer-events: none;
  }
</style>
