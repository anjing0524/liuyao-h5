const BASE = '/assets/divination/';

export const manifest = {
  bundles: [
    {
      name: 'environment',
      assets: [
        { alias: 'sky', src: BASE + 'sky.webp' },
        { alias: 'moon', src: BASE + 'moon.webp' },
        { alias: 'moonHalo', src: BASE + 'moon-halo.webp' },
        { alias: 'cloud', src: BASE + 'cloud.webp' },
        { alias: 'haze', src: BASE + 'haze.webp' },
        { alias: 'moonBeam', src: BASE + 'moonbeam.webp' },
        { alias: 'groundLight', src: BASE + 'ground-light.webp' },
        { alias: 'vignette', src: BASE + 'vignette.webp' },
        { alias: 'dust', src: BASE + 'dust.webp' },
        { alias: 'grain', src: BASE + 'grain.webp' },
      ],
    },
    {
      name: 'tree',
      assets: [
        { alias: 'treeTrunk', src: BASE + 'tree-trunk.webp' },
        { alias: 'treeBranch', src: BASE + 'tree-branch.webp' },
        { alias: 'leavesBack', src: BASE + 'leaves-back.webp' },
        { alias: 'leavesBackBlur', src: BASE + 'leaves-back-blur.webp' },
        { alias: 'leavesFrontBlur', src: BASE + 'leaves-front-blur.webp' },
        { alias: 'leavesFrontRim', src: BASE + 'leaves-front-rim.webp' },
        { alias: 'leavesMidBlur', src: BASE + 'leaves-mid-blur.webp' },
        { alias: 'treeBranchRim', src: BASE + 'tree-branch-rim.webp' },
        { alias: 'leavesMid', src: BASE + 'leaves-mid.webp' },
        { alias: 'leavesFront', src: BASE + 'leaves-front.webp' },
      ],
    },
    {
      name: 'character',
      assets: [
        { alias: 'character', src: BASE + 'character.webp' },
        { alias: 'characterRim', src: BASE + 'character-rim.webp' },
        { alias: 'altar', src: BASE + 'altar.webp' },
      ],
    },
    {
      name: 'divination',
      assets: [
        { alias: 'leafFront', src: BASE + 'leaf-front.webp' },
        { alias: 'leafBack', src: BASE + 'leaf-back.webp' },
        { alias: 'leafSide', src: BASE + 'leaf-side.webp' },
      ],
    },
  ],
};
