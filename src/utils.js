export const readFileAsArrayBuffer = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.addEventListener("load", (event) => {
      resolve(event.target?.result);
    });
    reader.readAsArrayBuffer(file);
  });
};
