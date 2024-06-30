const content = {
  shop: {
    dialog:
      "Welcome to Planet XZ.\nYou may buy or sell items at the shop, head to the shipyard to outfit your vessel, and select your next contract before leaving.",
    actions: [
      { text: "1. Check out the shop", action: (scene) => scene.openShopMenu },
      { text: "2. Go to the shipyard", action: (scene) => scene.openShipMenu },
      {
        text: "3. Select your next contract",
        action: (scene) => scene.openContractMenu,
      },
      {
        text: "4. Depart",
        action: (scene) => scene.depart,
      },
    ],
  },
};

export default content;
