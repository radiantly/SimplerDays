<script>
  export let file;

  import * as zip from "@zip.js/zip.js";
  console.log(file, zip);
  const reader = new zip.ZipReader(new zip.BlobReader(file));
  reader.getEntries().then((entries) => {
    entries = entries
      .filter((entry) => !entry.directory && entry.filename)
      .sort((entry1, entry2) => entry1.filename.localeCompare(entry2.filename));
    console.log(entries);
  });
</script>

<div class="main-container">Hi</div>

<style>
  .main-container {
    display: flex;
  }
</style>
