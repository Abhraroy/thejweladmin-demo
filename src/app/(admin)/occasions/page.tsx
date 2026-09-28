import StyleOccasionManagementPage, {
  type StyleOccasionPageConfig,
} from '@/components/AdminComponents/style-occasion/StyleOccasionManagementPage';
import {
  createOccasion,
  updateOccasion,
  deleteOccasion,
} from '@/app/(admin)/actions/occasions';
import { getOccasionsPageData } from './action';

export const dynamic = 'force-dynamic';

const occasionConfig: StyleOccasionPageConfig = {
  title: 'Occasion Management',
  subtitle: 'Manage product occasions used in inventory.',
  entityLabel: 'Occasion',
  nameField: 'occasion_name',
  idField: 'occasion_id',
  imageField: 'image_link',
  actions: {
    create: createOccasion,
    update: updateOccasion,
    delete: deleteOccasion,
  },
};

export default async function OccasionsPage() {
  const { success, data, error } = await getOccasionsPageData();

  if (!success) {
    return (
      <div className="p-6 text-red-600">
        Error loading occasions: {error}
      </div>
    );
  }

  return (
    <StyleOccasionManagementPage
      config={occasionConfig}
      initialData={(data ?? []) as unknown as Record<string, unknown>[]}
    />
  );
}
