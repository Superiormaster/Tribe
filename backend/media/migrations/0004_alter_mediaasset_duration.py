from django.db import migrations, models


def convert_duration_to_float(apps, schema_editor):
    with schema_editor.connection.cursor() as cursor:

        # The old JSON/JSONB field may be NOT NULL.
        # Empty arrays such as [] will become NULL, so allow NULL first.
        cursor.execute("""
            ALTER TABLE media_mediaasset
            ALTER COLUMN duration DROP NOT NULL;
        """)

        cursor.execute("""
            ALTER TABLE media_mediaasset
            ALTER COLUMN duration TYPE double precision
            USING (
                CASE
                    WHEN duration IS NULL THEN NULL

                    -- JSON number: 12.5
                    WHEN jsonb_typeof(duration) = 'number'
                        THEN (duration::text)::double precision

                    -- JSON array: [12.5]
                    WHEN jsonb_typeof(duration) = 'array'
                         AND jsonb_array_length(duration) > 0
                         AND jsonb_typeof(duration->0) = 'number'
                        THEN (duration->>0)::double precision

                    -- Empty arrays: []
                    -- No duration available, so store NULL.
                    WHEN jsonb_typeof(duration) = 'array'
                         AND jsonb_array_length(duration) = 0
                        THEN NULL

                    ELSE NULL
                END
            );
        """)


class Migration(migrations.Migration):

    dependencies = [
        ("media", "0003_alter_mediaasset_media_id_and_more"),
    ]

    operations = [
        migrations.RunPython(
            convert_duration_to_float,
            migrations.RunPython.noop,
        ),

        migrations.AlterField(
            model_name="mediaasset",
            name="duration",
            field=models.FloatField(
                null=True,
                blank=True,
            ),
        ),
    ]