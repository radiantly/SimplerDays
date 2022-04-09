<script>
  export let file;

  const handleFile = (f) => {
    file = f;
    console.log(f);
  };

  const handleDrop = (e) => {
    const files = e.target.files || e.dataTransfer.files;
    if (!files.length) return;
    handleFile(files[0]);
  };

  const handleSelect = (e) => {
    if (!e.target.files.length) return;
    handleFile(e.target.files[0]);
  };
</script>

<svelte:body on:drop|preventDefault={handleDrop} />

<div class="main-container">
  <form class="container">
    <div class="heading">Simpler<br />days</div>
    <p>A delightful comic book reader for the web</p>
    <p>
      Drag and drop or
      <label class="select-file">
        <input
          type="file"
          accept=".cbz,application/vnd.comicbook+zip"
          on:change|self={handleSelect}
        />
        select
      </label>
      a .cbz file to start reading
    </p>
  </form>
</div>

<style>
  .main-container {
    flex-grow: 1;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: var(--red);
    color: var(--whitish);
  }
  .main-container::selection {
    color: inherit;
    background: rgba(255, 255, 255, 0.1);
  }
  .container {
    padding: min(10px, 2vw);
  }
  .heading {
    font-family: "Coolvetica Crammed";
    text-transform: uppercase;
    font-size: 210px;
    line-height: 0.82;
    margin-bottom: 20px;
  }
  p {
    font-family: "Coolvetica Condensed";
    font-size: 54px;
  }

  .select-file {
    cursor: pointer;
    position: relative;
    display: inline-flex;
  }

  .select-file::before {
    content: "";
    background-color: var(--whitish);
    width: 100%;
    position: absolute;
    bottom: 0;
    left: 0;
    height: 4px;
    transform-origin: bottom center;
  }

  .select-file:hover {
    color: var(--darkish);
  }

  .select-file:hover::before {
    background-color: var(--darkish);
  }

  .select-file input[type="file"] {
    display: none;
  }
</style>
