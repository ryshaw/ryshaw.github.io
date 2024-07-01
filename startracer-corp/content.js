const content = {
  shop: {
    dialog:
      "Welcome to Planet #name.\nYou can buy or sell items at the shop, head to the shipyard to repair or outfit your vessel, and select your next contract.",
    actions: [
      { text: "Check out the shop", action: (scene) => scene.openShopMenu },
      { text: "Go to the shipyard", action: (scene) => scene.openShipMenu },
      {
        text: "Go to the job board",
        action: (scene) => scene.openContractsMenu,
      },
      {
        text: "Depart (select a contract first)",
        action: (scene) => scene.depart,
      },
    ],
  },
};

export default content;
