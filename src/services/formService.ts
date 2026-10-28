import { supabase } from '../lib/supabase';
import { FormDefinition, FormField, FormVersion, UserProfile } from '../types/database';

export const formService = {
  async getForms(): Promise<FormDefinition[]> {
    const { data, error } = await supabase
      .from('form_definitions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching form definitions:', error);
      return [];
    }
    return data || [];
  },

  async getFormWithVersion(formId: string): Promise<{
    form: FormDefinition;
    version: FormVersion;
  } | null> {
    const { data: form, error: formErr } = await supabase
      .from('form_definitions')
      .select('*')
      .eq('id', formId)
      .single();

    if (formErr || !form) return null;

    // Get latest published or current version
    const { data: version, error: verErr } = await supabase
      .from('form_versions')
      .select('*')
      .eq('form_id', formId)
      .eq('version_number', form.current_version)
      .single();

    if (verErr || !version) {
      // Fallback to highest version
      const { data: highestVer } = await supabase
        .from('form_versions')
        .select('*')
        .eq('form_id', formId)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!highestVer) return null;
      return { form, version: highestVer };
    }

    return { form, version };
  },

  async getFormVersionById(versionId: string): Promise<FormVersion | null> {
    const { data, error } = await supabase
      .from('form_versions')
      .select('*')
      .eq('id', versionId)
      .maybeSingle();

    if (error || !data) return null;
    return data;
  },

  async createForm(
    payload: {
      title: string;
      description?: string;
      instructions?: string;
      publishImmediately?: boolean;
    },
    fields: FormField[],
    actor: UserProfile
  ): Promise<{ form: FormDefinition; version: FormVersion }> {
    const status = payload.publishImmediately ? 'published' : 'draft';

    // 1. Insert form definition
    const { data: form, error: formErr } = await supabase
      .from('form_definitions')
      .insert({
        title: payload.title.trim(),
        description: payload.description?.trim(),
        instructions: payload.instructions?.trim(),
        status,
        current_version: 1,
      })
      .select()
      .single();

    if (formErr) throw formErr;

    // 2. Insert form version 1
    const { data: version, error: verErr } = await supabase
      .from('form_versions')
      .insert({
        form_id: form.id,
        version_number: 1,
        fields_schema: fields,
        published_by: actor.id,
      })
      .select()
      .single();

    if (verErr) throw verErr;

    await supabase.from('audit_logs').insert({
      actor_id: actor.id,
      actor_name: actor.name,
      action: 'CRIAR_FORMULARIO',
      entity_type: 'form_definitions',
      entity_id: form.id,
      details: { title: form.title, status, version: 1, fieldsCount: fields.length },
    });

    return { form, version };
  },

  async publishNewVersion(
    formId: string,
    fields: FormField[],
    actor: UserProfile
  ): Promise<FormVersion> {
    // 1. Get current form
    const { data: form, error: formErr } = await supabase
      .from('form_definitions')
      .select('*')
      .eq('id', formId)
      .single();

    if (formErr || !form) throw new Error('Formulário não encontrado');

    const nextVersionNumber = form.current_version + 1;

    // 2. Insert new version (Preserves old version for historical tickets)
    const { data: version, error: verErr } = await supabase
      .from('form_versions')
      .insert({
        form_id: formId,
        version_number: nextVersionNumber,
        fields_schema: fields,
        published_by: actor.id,
      })
      .select()
      .single();

    if (verErr) throw verErr;

    // 3. Update form definition pointer
    await supabase
      .from('form_definitions')
      .update({
        current_version: nextVersionNumber,
        status: 'published',
        updated_at: new Date().toISOString(),
      })
      .eq('id', formId);

    await supabase.from('audit_logs').insert({
      actor_id: actor.id,
      actor_name: actor.name,
      action: 'PUBLICAR_VERSAO_FORMULARIO',
      entity_type: 'form_definitions',
      entity_id: formId,
      details: { newVersion: nextVersionNumber, fieldsCount: fields.length },
    });

    return version;
  },

  async duplicateForm(
    formId: string,
    newTitle: string,
    actor: UserProfile
  ): Promise<{ form: FormDefinition; version: FormVersion }> {
    const original = await this.getFormWithVersion(formId);
    if (!original) throw new Error('Formulário original não encontrado');

    return this.createForm(
      {
        title: newTitle || `${original.form.title} (Cópia)`,
        description: original.form.description,
        instructions: original.form.instructions,
        publishImmediately: false,
      },
      original.version.fields_schema,
      actor
    );
  },

  async archiveForm(formId: string, actor: UserProfile): Promise<void> {
    const { error } = await supabase
      .from('form_definitions')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', formId);

    if (error) throw error;

    await supabase.from('audit_logs').insert({
      actor_id: actor.id,
      actor_name: actor.name,
      action: 'ARQUIVAR_FORMULARIO',
      entity_type: 'form_definitions',
      entity_id: formId,
    });
  },
};
