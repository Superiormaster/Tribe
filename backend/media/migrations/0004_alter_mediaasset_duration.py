from django.db import migrations, models


def convert_duration_to_float(apps, schema_editor):
    with schema_editor.connection.cursor() as cursor:
        cursor.execute("""
            ALTER TABLE media_mediaasset
            ALTER COLUMN duration TYPE double precision
            USING (
                CASE
                    WHEN duration IS NULL THEN NULL
                    WHEN jsonb_typeof(duration) = 'array'
                        THEN NULLIF(duration->>0, '')::double precision
                    WHEN jsonb_typeof(duration) = 'number'
                        THEN (duration #>> '{}')::double precision
                    ELSE NULL
                END
            );
        """)


class Migration(migrations.Migration):

    dependencies = [
        ("media", "0003_alter_mediaasset_media_id_and_more"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(
                    convert_duration_to_float,
                    reverse_code=migrations.RunPython.noop,
                ),
            ],
            state_operations=[
                migrations.AlterField(
                    model_name="mediaasset",
                    name="duration",
                    field=models.FloatField(
                        blank=True,
                        null=True,
                    ),
                ),
            ],
        ),
    ]