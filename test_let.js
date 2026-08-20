const OPME = (() => {
  function openModal() {
    console.log(deletedItemIds);
    deletedItemIds = [];
    console.log("Success:", deletedItemIds);
  }

  let deletedItemIds = [];
  return { openModal };
})();
OPME.openModal();
