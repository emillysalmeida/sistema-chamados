import { supabase } from '../lib/supabase';
import { UserProfile } from '../types/database';

export interface UploadedFileMetadata {
  name: string;
  size: number;
  type: string;
  storage_path: string;
  storage_bucket: string;
  uploaded_at: string;
  uploaded_by: string;
}

export const storageService = {
  BUCKET_NAME: 'ticket-attachments',

  /**
   * Faz upload real de arquivo para o Supabase Storage.
   * Não salva nomes ou caminhos fictícios se o upload falhar.
   * Não converte arquivos corporativos em base64 arbitrário.
   */
  async uploadAttachment(
    file: File,
    ticketIdOuPrefix: string,
    user: UserProfile
  ): Promise<UploadedFileMetadata> {
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const folder = ticketIdOuPrefix.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = `${folder}/${timestamp}_${sanitizedName}`;

    // Executa upload no bucket seguro do Supabase
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from(this.BUCKET_NAME)
      .upload(filePath, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

    if (uploadErr || !uploadData?.path) {
      const msg = uploadErr?.message || 'Falha ao conectar com o serviço de armazenamento.';
      throw new Error(
        `Não foi possível enviar o anexo "${file.name}": ${msg}. Certifique-se de que o bucket "${this.BUCKET_NAME}" existe e está configurado no Supabase.`
      );
    }

    return {
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      storage_path: uploadData.path,
      storage_bucket: this.BUCKET_NAME,
      uploaded_at: new Date().toISOString(),
      uploaded_by: user.id,
    };
  },

  /**
   * Obtém URL assinada (temporária e privada) para visualização ou download seguro
   */
  async getFileUrl(fileData: any): Promise<string | null> {
    if (!fileData) return null;

    // Se tiver caminho persistido no bucket Supabase
    if (fileData.storage_path) {
      const bucket = fileData.storage_bucket || this.BUCKET_NAME;
      try {
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(fileData.storage_path, 3600); // Válida por 1 hora

        if (!error && data?.signedUrl) {
          return data.signedUrl;
        }
      } catch (err) {
        console.warn('Erro ao gerar signed URL para anexo:', err);
      }
    }

    // Suporte retroativo caso algum anexo transitório tenha sido salvo com data_url
    if (fileData.data_url) {
      return fileData.data_url;
    }

    return null;
  },

  /**
   * Dispara o download seguro do arquivo original
   */
  async downloadFile(fileData: any, customFilename?: string): Promise<void> {
    const fileName = customFilename || fileData?.name || 'anexo';
    const url = await this.getFileUrl(fileData);

    if (!url) {
      throw new Error(
        'Arquivo original não encontrado no armazenamento. Registros anteriores que continham apenas metadados ou caminhos não confirmados estão indisponíveis.'
      );
    }

    if (url.startsWith('data:')) {
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Falha ao obter o arquivo do armazenamento.');
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      // Fallback: abrir URL em nova aba caso CORS restrinja leitura direta via blob
      window.open(url, '_blank');
    }
  },

  /**
   * Abre o arquivo para visualização em nova aba
   */
  async viewFile(fileData: any): Promise<void> {
    const url = await this.getFileUrl(fileData);

    if (!url) {
      throw new Error(
        'Arquivo original indisponível para visualização. Registros anteriores que continham apenas o nome salvo não possuem o arquivo armazenado.'
      );
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  },
};
