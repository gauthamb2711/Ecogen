import heroForestImg from '../assets/images/hero_forest_canopy_1794547641078.jpg';
import coralOceanImg from '../assets/images/issue_coral_ocean_1794547697145.jpg';
import urbanSolarImg from '../assets/images/campaign_urban_solar_1794547624315.jpg';
import fieldResearchImg from '../assets/images/academy_field_research_1794547593193.jpg';

const IMAGE_MAP: Record<string, string> = {
  '/src/assets/images/hero_forest_canopy_1794547641078.jpg': heroForestImg,
  '/src/assets/images/issue_coral_ocean_1794547697145.jpg': coralOceanImg,
  '/src/assets/images/campaign_urban_solar_1794547624315.jpg': urbanSolarImg,
  '/src/assets/images/academy_field_research_1794547593193.jpg': fieldResearchImg,
};

export function resolveClientImage(src: string): string {
  return IMAGE_MAP[src] || src;
}
