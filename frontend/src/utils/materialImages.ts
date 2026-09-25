import { normalizeImageUrl } from '@/config/api';

export const LOCAL_MATERIAL_MAP: Record<string, any> = {
  clay: require('../../assets/images/materials/raw_clay.jpg'),
  raw_clay: require('../../assets/images/materials/raw_clay.jpg'),
  terracotta: require('../../assets/images/materials/raw_clay.jpg'),
  sabai_grass: require('../../assets/images/materials/sabai_grass.jpg'),
  grass: require('../../assets/images/materials/sabai_grass.jpg'),
  bamboo: require('../../assets/images/materials/bamboo_stalks.jpg'),
  bamboo_stalks: require('../../assets/images/materials/bamboo_stalks.jpg'),
  cane: require('../../assets/images/materials/bamboo_stalks.jpg'),
  cotton_yarn: require('../../assets/images/materials/cotton_yarn.jpg'),
  cotton: require('../../assets/images/materials/cotton_yarn.jpg'),
  yarn: require('../../assets/images/materials/cotton_yarn.jpg'),
  natural_dyes: require('../../assets/images/materials/natural_dyes.jpg'),
  dyes: require('../../assets/images/materials/natural_dyes.jpg'),
  wood: require('../../assets/images/materials/carving_wood.jpg'),
  carving_wood: require('../../assets/images/materials/carving_wood.jpg'),
  carving_tools: require('../../assets/images/materials/carving_chisels.jpg'),
  carving_chisels: require('../../assets/images/materials/carving_chisels.jpg'),
  chisels: require('../../assets/images/materials/carving_chisels.jpg'),
  pottery_tools: require('../../assets/images/materials/clay_modeling_tools.jpg'),
  clay_modeling_tools: require('../../assets/images/materials/clay_modeling_tools.jpg'),
  pottery_wheel: require('../../assets/images/materials/pottery_wheel.jpg'),
  weaving_shuttles: require('../../assets/images/materials/weaving_shuttle.jpg'),
  weaving_shuttle: require('../../assets/images/materials/weaving_shuttle.jpg'),
};

/**
 * Returns a high-quality local image or normalized remote image that exactly
 * matches the material name or ID mentioned in the text.
 */
export function getMaterialImage(nameOrId?: string, remoteUrl?: string): any {
  if (!nameOrId) {
    if (remoteUrl && typeof remoteUrl === 'string' && remoteUrl.trim()) {
      return { uri: normalizeImageUrl(remoteUrl) };
    }
    return LOCAL_MATERIAL_MAP.clay;
  }

  const s = nameOrId.toLowerCase().trim();

  // If item is 'others' or 'more', no specific material photo
  if (s === 'others' || s === 'more') {
    return null;
  }

  // Exact ID match
  if (LOCAL_MATERIAL_MAP[s]) {
    return LOCAL_MATERIAL_MAP[s];
  }

  // Keyword-based detection from text
  if (s.includes('clay') || s.includes('terracotta') || s.includes('mitti')) {
    return LOCAL_MATERIAL_MAP.raw_clay;
  }
  if (s.includes('sabai') || s.includes('grass') || s.includes('jute')) {
    return LOCAL_MATERIAL_MAP.sabai_grass;
  }
  if (s.includes('bamboo') || s.includes('cane')) {
    return LOCAL_MATERIAL_MAP.bamboo;
  }
  if (s.includes('cotton') || s.includes('yarn') || s.includes('thread')) {
    return LOCAL_MATERIAL_MAP.cotton_yarn;
  }
  if (s.includes('dye') || s.includes('color') || s.includes('indigo')) {
    return LOCAL_MATERIAL_MAP.natural_dyes;
  }
  if (s.includes('chisel') || s.includes('carving tool')) {
    return LOCAL_MATERIAL_MAP.carving_chisels;
  }
  if (s.includes('pottery wheel') || s.includes('wheel')) {
    return LOCAL_MATERIAL_MAP.pottery_wheel;
  }
  if (s.includes('shuttle') || s.includes('loom') || s.includes('weaving')) {
    return LOCAL_MATERIAL_MAP.weaving_shuttle;
  }
  if (s.includes('modeling') || s.includes('pottery tool')) {
    return LOCAL_MATERIAL_MAP.clay_modeling_tools;
  }
  if (s.includes('wood') || s.includes('timber')) {
    return LOCAL_MATERIAL_MAP.carving_wood;
  }

  if (remoteUrl && typeof remoteUrl === 'string' && remoteUrl.trim()) {
    return { uri: normalizeImageUrl(remoteUrl) };
  }

  return LOCAL_MATERIAL_MAP.raw_clay;
}
