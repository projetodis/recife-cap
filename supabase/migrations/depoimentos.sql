-- Tabela de depoimentos para a landing page
create table if not exists depoimentos (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  cidade      text not null default 'Recife, PE',
  premio      text not null,
  sorteio     text not null,
  depoimento  text not null,
  foto_url    text,
  ativo       boolean not null default true,
  ordem       integer not null default 0,
  created_at  timestamptz not null default now()
);

-- RLS
alter table depoimentos enable row level security;

create policy "admin_all_depoimentos" on depoimentos
  for all using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'operador_sorteio')
    )
  );

create policy "public_select_depoimentos" on depoimentos
  for select using (ativo = true);

create index if not exists idx_depoimentos_ativo_ordem on depoimentos(ativo, ordem);

-- Dados iniciais
insert into depoimentos (nome, cidade, premio, sorteio, depoimento, ordem) values
  ('Maria das Graças', 'Recife, PE', 'R$ 5.000', 'Edição 12', 'Nunca pensei que ganharia! Recebi o prêmio rapidinho, sem complicação nenhuma. Já comprei minha cartela da próxima edição!', 0),
  ('João Carlos', 'Olinda, PE', 'R$ 2.000', 'Edição 11', 'Fui premiado na edição 11 e foi incrível. O sistema é super transparente e o sorteio ao vivo é emocionante demais!', 1),
  ('Ana Paula', 'Caruaru, PE', 'R$ 1.500', 'Edição 10', 'Indiquei para toda minha família depois que ganhei. Processo simples, prêmio entregue em casa. Recomendo muito!', 2),
  ('Pedro Henrique', 'Jaboatão, PE', 'R$ 3.000', 'Edição 9', 'Comprei 3 cartelas e uma delas foi premiada. A transparência do sorteio ao vivo me deu muita confiança. Parabéns!', 3),
  ('Francisca Lima', 'Paulista, PE', 'R$ 1.000', 'Edição 8', 'O atendimento é excelente. Recebi meu prêmio rapidamente e já participei de mais duas edições desde então!', 4),
  ('Carlos Eduardo', 'Recife, PE', 'R$ 2.500', 'Edição 7', 'Participei como brincadeira e acabei ganhando! O sistema é muito confiável e o suporte tirou todas as minhas dúvidas.', 5);
