export function registerAssets(app) {

  const assetMap = {
    GSplat:     new pc.Asset("Full", "gsplat", { url: "assets/gsplats/Full.compressed.ply" }),
    Woman:      new pc.Asset("Woman", "container", { url: "assets/models/woman.glb" }),
    Coin:       new pc.Asset("Coin", "container", { url: "assets/models/Coin.glb" }),
    idle_1:     new pc.Asset("idle_1", "container", { url: "assets/anims/idle_1.glb" }),
    idle_2:     new pc.Asset("idle_2", "container", { url: "assets/anims/idle_2.glb" }),
    idle_3:     new pc.Asset("idle_3", "container", { url: "assets/anims/idle_3.glb" }),
    Jump:       new pc.Asset("Jump", "container", { url: "assets/anims/Jump.glb" }),
    Walk:       new pc.Asset("Walk", "container", { url: "assets/anims/Walk.glb" }),

    Skin_Diffuse:        new pc.Asset("Skin_Diffuse", "texture",   { url: "assets/textures/Skin_Diffuse.jpg" }),
    Skin_Normal:         new pc.Asset("Skin_Normal",  "texture",   { url: "assets/textures/Skin_Normal.jpg" }),
    Eyelashes_Diffuse:   new pc.Asset("Eyelashes_Diffuse", "texture", { url: "assets/textures/Eyelashes_Diffuse.jpg" }),
    Eyelashes_Opacity:   new pc.Asset("Eyelashes_Opacity", "texture", { url: "assets/textures/Eyelashes_Opacity.jpg" }),
    Scalp_Diffuse:       new pc.Asset("Scalp_Diffuse", "texture",  { url: "assets/textures/Scalp_Diffuse.jpg" }),
    Scalp_Opacity:       new pc.Asset("Scalp_Opacity", "texture",  { url: "assets/textures/Scalp_Opacity.jpg" }),
    Hair_Diffuse:        new pc.Asset("Hair_Diffuse", "texture",   { url: "assets/textures/Hair_Diffuse.jpg" }),
    Hair_Opacity:        new pc.Asset("Hair_Opacity", "texture",   { url: "assets/textures/Hair_Opacity.jpg" }),
    Underwear_Diffuse:   new pc.Asset("Underwear_Diffuse", "texture", { url: "assets/textures/Underwear_Diffuse.jpg" }),
    Underwear_Normal:    new pc.Asset("Underwear_Normal", "texture",  { url: "assets/textures/Underwear_Normal.jpg" }),
    Top_Diffuse:         new pc.Asset("Top_Diffuse", "texture",    { url: "assets/textures/Top_Diffuse.jpg" }),
    Top_Normal:          new pc.Asset("Top_Normal", "texture",     { url: "assets/textures/Top_Normal.jpg" })
  };

  const scriptAssets = [
    new pc.Asset("followCamera.js", "script", { url: "assets/scripts/default/followCamera.js" }),
    new pc.Asset("keyboardMovement.js", "script", { url: "assets/scripts/default/keyboardMovement.js" }),
    new pc.Asset("touchMovement.js", "script", { url: "assets/scripts/default/touchMovement.js" }),
    new pc.Asset("wallColliders.js", "script", { url: "assets/scripts/default/wallColliders.js" }),
    new pc.Asset("colliders.js", "script", { url: "assets/scripts/default/colliders.js" }),
    new pc.Asset("coinSpawner.js", "script", { url: "assets/scripts/default/coinSpawner.js" }),
    new pc.Asset("coinDestroyer.js", "script", { url: "assets/scripts/default/coinDestroyer.js" }),
    new pc.Asset("assignWomanMaterials.js", "script", { url: "assets/scripts/default/assignWomanMaterials.js" }),
    new pc.Asset("ar-ground.js", "script", { url: "assets/scripts/default/ar-ground.js" }),
    new pc.Asset("coinsChecker.js", "script", { url: "assets/scripts/default/coinsChecker.js" })
  ];

  scriptAssets.forEach(a => app.assets.add(a));
  Object.values(assetMap).forEach(a => app.assets.add(a));

  [
    assetMap.Skin_Diffuse,
    assetMap.Eyelashes_Diffuse,
    assetMap.Eyelashes_Opacity,
    assetMap.Scalp_Diffuse,
    assetMap.Scalp_Opacity,
    assetMap.Hair_Diffuse,
    assetMap.Hair_Opacity,
    assetMap.Underwear_Diffuse,
    assetMap.Top_Diffuse
  ].forEach(asset => {
    asset.on('load', function (a) {
      if (a.resource) a.resource.srgb = true;
    });
  });

  [
    assetMap.Skin_Normal,
    assetMap.Underwear_Normal,
    assetMap.Top_Normal
  ].forEach(asset => {
    asset.on('load', function (a) {
      if (a.resource) a.resource.srgb = false;
    });
  });

  const assetList = [
    { asset: assetMap.GSplat,             size: 5.94 * 1024 * 1024 },
    { asset: assetMap.Woman,              size: 2.98 * 1024 * 1024 },
    { asset: assetMap.Coin,               size: 44 * 1024 },

    { asset: assetMap.idle_1,             size: 36 * 1024 },
    { asset: assetMap.idle_2,             size: 48 * 1024 },
    { asset: assetMap.idle_3,             size: 67 * 1024 },
    { asset: assetMap.Jump,               size: 25 * 1024 },
    { asset: assetMap.Walk,               size: 18 * 1024 },

    { asset: assetMap.Skin_Diffuse,       size: 164 * 1024 },
    { asset: assetMap.Skin_Normal,        size: 139 * 1024 },
    { asset: assetMap.Eyelashes_Diffuse,  size: 26  * 1024 },
    { asset: assetMap.Eyelashes_Opacity,  size: 66  * 1024 },
    { asset: assetMap.Scalp_Diffuse,      size: 49  * 1024 },
    { asset: assetMap.Scalp_Opacity,      size: 127 * 1024 },
    { asset: assetMap.Hair_Diffuse,       size: 208 * 1024 },
    { asset: assetMap.Hair_Opacity,       size: 223 * 1024 },
    { asset: assetMap.Underwear_Diffuse,  size: 93  * 1024 },
    { asset: assetMap.Underwear_Normal,   size: 88  * 1024 },
    { asset: assetMap.Top_Diffuse,        size: 147 * 1024 },
    { asset: assetMap.Top_Normal,         size: 112 * 1024 },

    { asset: scriptAssets[0],           size: 4 * 1024 },
    { asset: scriptAssets[1],           size: 5 * 1024 },
    { asset: scriptAssets[2],           size: 10 * 1024 },
    { asset: scriptAssets[3],           size: 4 * 1024 },
    { asset: scriptAssets[4],           size: 2 * 1024 },
    { asset: scriptAssets[5],           size: 2 * 1024 },
    { asset: scriptAssets[6],           size: 4 * 1024 },
    { asset: scriptAssets[7],           size: 5 * 1024 },
    { asset: scriptAssets[8],           size: 1024 },
    { asset: scriptAssets[9],           size: 2 * 1024 }
  ];

  return { assetMap, scriptAssets, assetList };
}