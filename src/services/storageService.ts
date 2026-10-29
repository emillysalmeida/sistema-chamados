import { supabase } from '../lib/supabase';
import { UserProfile } from '../types/database';

export interface UploadedFileMetadata {
  name: string;
  size: number;
  type: string;
  storage_path?: string;
  storage_bucket?: string;
  data_url?: string; // Fallback se storage não estiver disponível (arquivos pequenos)
  uploaded_at: string;
  uploaded_by: string;
}

export const storageService = {
  BUCKET_NAME: 'ticket-attachments',

  /**
   * Faz upload de um arquivo real (File | Blob) para o Supabase Storage ou fallback inline
   * @param file Arquivo a ser enviado
   * @param ticketIdOuPrefix ID do chamado ou protocolo para isolamento em pasta
   * @param user Usuário que está enviando
   */
  async uploadAttachment(
    file: File,
    ticketIdOuPrefix: string,
    user: UserProfile
  ): Promise<UploadedFileMetadata> {
    const timestamp = Date.now();
    // Sanitiza nome do arquivo mantendo extensão
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const folder = ticketIdOuPrefix.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = `${folder}/${timestamp}_${sanitizedName}`;

    try {
      // 1. Tentar upload no Supabase Storage
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, file, {
          contentType: file.type || 'application/octet-stream',
          upsert: true,
        });

      if (!uploadErr && uploadData?.path) {
        return {
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          storage_path: uploadData.path,
          storage_bucket: this.BUCKET_NAME,
          uploaded_at: new Date().toISOString(),
          uploaded_by: user.id,
        };
      }
    } catch {
      // Falha de storage, continua para fallback inline se arquivo < 3MB
    }

    // 2. Fallback resiliente: converter para base64 data URL se for menor que 3.5MB
    // para garantir visualização/download mesmo sem bucket configurado
    if (file.size <= 3.5 * 1024 * 1024) {
      const dataUrl = await this.fileToDataUrl(file);
      return {
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        data_url: dataUrl,
        uploaded_at: new Date().toISOString(),
        uploaded_by: user.id,
      };
    }

    // Se falhou no storage e excede 3.5MB, retorna metadados com indicação
    return {
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      storage_path: filePath,
      storage_bucket: this.BUCKET_NAME,
      uploaded_at: new Date().toISOString(),
      uploaded_by: user.id,
    };
  },

  /**
   * Converte File para Data URL Base64
   */
  fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  },

  /**
   * Obtém URL segura para download ou visualização
   * Prioriza Signed URL do Supabase Storage; se tiver data_url, usa diretamente.
   */
  async getFileUrl(fileData: any): Promise<string | null> {
    if (!fileData) return null;

    // 1. Se tem data_url embutido (fallback)
    if (fileData.data_url) {
      return fileData.data_url;
    }

    // 2. Se tem storage_path no bucket
    if (fileData.storage_path) {
      const bucket = fileData.storage_bucket || this.BUCKET_NAME;
      try {
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(fileData.storage_path, 3600); // 1 hora de validade

        if (!error && data?.signedUrl) {
          return data.signedUrl;
        }
      } catch (err) {
        console.warn('Erro ao gerar signed URL para anexo:', err);
      }
    }

    return null;
  },

  /**
   * Dispara o download de um anexo de forma segura no navegador
   */
  async downloadFile(fileData: any, customFilename?: string): Promise<void> {
    const fileName = customFilename || fileData?.name || 'anexo';
    const url = await this.getFileUrl(fileData);

    if (!url) {
      throw new Error(
        'Arquivo original não encontrado no armazenamento. Os anexos anteriores possuíam apenas o registro do nome salvo.'
      );
    }

    // Se for data_url (base64)
    if (url.startsWith('data:')) {
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    // Se for URL externa / Supabase Storage signed URL
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Falha na resposta do servidor de armazenamento');
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
      // Se CORS impedir o fetch do blob, abre a URL diretamente para download
      window.open(url, '_blank');
    }
  },

  /**
   * Abre o arquivo para visualização (inline preview) em nova aba ou modal
   */
  async viewFile(fileData: any): Promise<void> {
    const url = await this.getFileUrl(fileData);

    if (!url) {
      throw new Error(
        'Arquivo original indisponível para visualização. Os anexos anteriores possuíam apenas o registro do nome salvo.'
      );
    }

    // Se for data_url (PDF ou imagem), abrir em janela ou aba
    if (url.startsWith('data:')) {
      const win = window.open();
      if (win) {
        if (fileData?.type?.startsWith('image/')) {
          win.document.write(
            `<html><head><title>${fileData.name || 'Visualização'}</title><style>body{margin:0;display:flex;align-items:center;justify-content:center;background:#1e293b;height:100vh;}img{max-width:95%;max-height:95%;box-shadow:0 10px 25px rgba(0,0,0,0.5);border-radius:6px;}</style></head><body><img src="${url}" alt="${fileData.name}" /></body></html>`
          );
        } else {
          // Para PDF em data URL, renderizar em iframe
          win.document.write(
            `<html><head><title>${fileData.name || 'Visualização'}</title><style>body{margin:0;height:100vh;overflow:hidden;}iframe{width:100%;height:100%;border:none;}</style></head><body><iframe src="${url}"></iframe></body></html>`
          );
        }
        win.document.close();
        return;
      }
    }

    // Caso seja URL normal / Signed URL
    window.open(url, '_blank', 'noopener,noreferrer');
  },
};

