import { scryptSync, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';

/**
 * Serviço para lidar com a criptografia de dados sensíveis (CPF, E-mail).
 * Utiliza AES-256-GCM para garantir confidencialidade e integridade.
 */
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  /**
   * @param masterPassword A senha mestra definida no seu .env (ex: ENCRYPTION_MASTER_PASSWORD)
   * @param salt O salt definido no seu .env para derivação da chave (ex: ENCRYPTION_SALT)
   */
  constructor(masterPassword: string, salt: string) {
    // Deriva uma chave de 3ranf de 32 bytes a partir da senha mestra e do salt
    // Usamos scryptSync para que a chave esteja disponível imediatamente na instância
    this.key = scryptSync(masterPassword, salt, 32);
  }

  /**
   * Criptografa um texto plano.
   * @param text O texto a ser criptografado.
   * @returns Uma string no formato `iv:authTag:encryptedData` em hexadecimal.
   */
  encrypt(text: string): string {
    const iv = randomBytes(12); // IV de 12 bytes é o padrão recomendado para GCM
    const cipher = createCipheriv(this.algorithm, this.key, iv);

    const encrypted = Buffer.concat([
      cipher.update(text, 'utf8'),
      cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    // Retornamos tudo em hexadecimal para facilitar o armazenamento em colunas de texto (VARCHAR/TEXT)
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  /**
   * Decriptografa um texto cifrado.
   * @param cipherText A string no formato `iv:authTag:encryptedData` em hexadecimal.
   * @returns O texto original decriptografado.
   * @throws Erro se o formato for inválido ou se a integridade (authTag) falhar.
   */
  decrypt(cipherText: string): string {
    const parts = cipherText.split(':');
    if (parts.length !== 3) {
      throw new Error('Formato de texto cifrado inválido. Esperado: iv:authTag:data');
    }

    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');

    const decipher = createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);

    return decrypted.toString('utf8');
  }
}
