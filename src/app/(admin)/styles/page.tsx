import StyleOccasionManagementPage, {
  type StyleOccasionPageConfig,
} from '@/components/AdminComponents/style-occasion/StyleOccasionManagementPage';
import {
  createStyle,
  updateStyle,
  deleteStyle,
} from '@/app/(admin)/actions/styles';
import { getStylesPageData } from './action';

export const dynamic = 'force-dynamic';

const styleConfig: StyleOccasionPageConfig = {
  title: 'Style Management',
  subtitle: 'Manage product styles used in inventory.',
  entityLabel: 'Style',
  nameField: 'style_name',
  idField: 'style_id',
  imageField: 'image_link',
  actions: {
    create: createStyle,
    update: updateStyle,
    delete: deleteStyle,
  },
};

export default async function StylesPage() {
  const { success, data, error } = await getStylesPageData();

  if (!success) {
    return (
      <div className="p-6 text-red-600">
        Error loading styles: {error}
      </div>
    );
  }

  return (
    <StyleOccasionManagementPage
      config={styleConfig}
      initialData={(data ?? []) as unknown as Record<string, unknown>[]}
    />
  );
}
