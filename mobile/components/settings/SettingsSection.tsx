// components/settings/SettingsSection.tsx

type Props = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export default function SettingsSection({
  title,
  description,
  children,
}: Props) {
  return (
    <section>
      <h2 className="text-lg text-gray-700 dark:text-gray-400 font-semibold">
        {title}
      </h2>

      {description && (
        <p className="text-sm text-gray-600 dark:text-gray-500 text-muted-foreground mb-3">
          {description}
        </p>
      )}

      <div className="space-y-2">
        {children}
      </div>
    </section>
  );
}