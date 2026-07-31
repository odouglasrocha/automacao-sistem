export interface Material {
  Codigo: string;
  Material: string;
  Gramagem: string;
  Und: number;
  Caixas: number;
  PPm: number;
  // Referências adicionais solicitadas pelo usuário
  // Pacote: quantidade de unidades por pacote (valor de referência). Utilizado como string para permitir formatação "10,000".
  // Pallet: quantidade de caixas por pallet (valor de referência)
  Pacote: string;
  Pallet: number;
}

export interface PlanItem {
  CodMaterialProducao: string;
  MaterialProducao: string;
  PlanoCaixasFardos: number;
  Tons: number;
  BolsasProduzido?: number;
  timelineDate?: string | null;
  importBatchId?: string | null;
  uploadMode?: 'replace' | 'new_version' | null;
  uploadedAt?: string;
  uploadedBy?: string | null;
  _id?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductionUpdate {
  CodMaterialSap: string;
  TextoBreveMaterial: string;
  Qtd_real_origem: number;
  Unid_medida_basica: string;
  Data_de_criacao: string;
}

export interface EnrichedPlanItem extends PlanItem {
  material?: Material;
  produtividadeEsperada?: number;
  consumoMateriaPrima?: number;
  // Progresso principal (sempre <= 100)
  progressoProducao?: number;
  // Percentual excedente acima de 100% (0..13)
  excedentePercent?: number;
  // Percentual bruto sem clamp (pode ser >100)
  rawProgressoPercent?: number;
  totalBolsasProduzido: number;
}