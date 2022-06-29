import { createExtractorFromData } from "node-unrar-js";
import { readFileAsArrayBuffer } from "./utils";

const wasmBinaryPromise = fetch("unrar.wasm").then((response) =>
  response.arrayBuffer()
);

self.addEventListener("message", async ({ data: { file } }) => {
  const [wasmBinary, fileBuffer] = await Promise.all([
    wasmBinaryPromise,
    readFileAsArrayBuffer(file),
  ]);

  const extractor = await createExtractorFromData({
    wasmBinary,
    data: fileBuffer,
  });

  // skip directories and files without a name
  const entryFilter = (fileHeader) =>
    !fileHeader.flags.directory && fileHeader.name;

  // get the list of files, sort them and create a map with each file name
  // and the corresponding page number
  const pageMap = [...extractor.getFileList().fileHeaders]
    .filter(entryFilter)
    .sort((fileHeader1, fileHeader2) =>
      fileHeader1.name.localeCompare(fileHeader2.name)
    )
    .reduce(
      (map, fileHeader, index) => map.set(fileHeader.name, index),
      new Map()
    );

  self.postMessage({
    pageCount: pageMap.size,
  });

  const { files } = extractor.extract({ files: entryFilter });
  for (const { fileHeader, extraction } of files)
    self.postMessage({
      pageBlob: new Blob([extraction]),
      pageIndex: pageMap.get(fileHeader.name),
    });
});
