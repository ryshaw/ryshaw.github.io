const content = {
  shop: {
    dialog:
      "Welcome to Planet XZ.\nYou can buy or sell items at the shop, head to the shipyard to repair or outfit your vessel, and select your next contract.",
    actions: [
      { text: "1. Check out the shop", action: (scene) => scene.openShopMenu },
      { text: "2. Go to the shipyard", action: (scene) => scene.openShipMenu },
      {
        text: "3. Go to the job board",
        action: (scene) => scene.openContractsMenu,
      },
      {
        text: "4. Depart",
        action: (scene) => scene.depart,
      },
    ],
  },
};

export default content;
