with site_products(name, category, detail, image_path) as (
  values
    ('Caneca personalizada', 'Canecas', 'Um clássico para personalizar do seu jeito.', 'https://raw.githubusercontent.com/milenar18/Berit/main/2.0/assets/images/Caneca.jpeg'),
    ('Caneca Mãe', 'Canecas', 'Uma lembrança carinhosa para quem sempre cuida.', 'https://raw.githubusercontent.com/milenar18/Berit/main/2.0/assets/images/Caneca%20M%C3%A3e.jpeg'),
    ('Caneca Vaquinha', 'Canecas', 'Estampa divertida para alegrar a rotina.', 'https://raw.githubusercontent.com/milenar18/Berit/main/2.0/assets/images/Caneca%20Vaquinha.jpeg'),
    ('Caneca infantil', 'Canecas', 'Leve, colorida e feita para os pequenos.', 'https://raw.githubusercontent.com/milenar18/Berit/main/2.0/assets/images/Caneca%20Pol%C3%ADmero%20Crian%C3%A7a.jpeg'),
    ('Garrafa térmica', 'Garrafas', 'Sua bebida favorita sempre por perto.', 'https://raw.githubusercontent.com/milenar18/Berit/main/2.0/assets/images/Garrafa%20T%C3%A9rmica.jpeg'),
    ('Garrafa térmica com canudo', 'Garrafas', 'Praticidade para levar a todos os lugares.', 'https://raw.githubusercontent.com/milenar18/Berit/main/2.0/assets/images/Garrafa%20T%C3%A9rmica%20Canudo.jpeg'),
    ('Chaveiro personalizado', 'Chaveiros', 'Um detalhe especial para carregar todo dia.', 'https://raw.githubusercontent.com/milenar18/Berit/main/2.0/assets/images/Chaveiro.jpeg'),
    ('Chaveiro Pai', 'Chaveiros', 'Um presente cheio de significado.', 'https://raw.githubusercontent.com/milenar18/Berit/main/2.0/assets/images/Chaveiro%20Pai.jpeg'),
    ('Relógio azulejo', 'Relógios', 'Um toque especial para decorar a casa.', 'https://raw.githubusercontent.com/milenar18/Berit/main/2.0/assets/images/Rel%C3%B3gio%20Azulejo.jpeg'),
    ('Relógio mapa-múndi', 'Relógios', 'Para quem sonha com novos destinos.', 'https://raw.githubusercontent.com/milenar18/Berit/main/2.0/assets/images/Rel%C3%B3gio%20mapa%20mundi.png'),
    ('Quebra-cabeça Hulk', 'Quebra-cabeças', 'Diversão garantida para fãs e colecionadores.', 'https://raw.githubusercontent.com/milenar18/Berit/main/2.0/assets/images/Quebra-cabe%C3%A7a%20hulk.png')
)
insert into public.products (name, category, detail, image_path)
select site_products.name, site_products.category, site_products.detail, site_products.image_path
from site_products
where not exists (
  select 1 from public.products existing
  where lower(existing.name) = lower(site_products.name)
    and lower(existing.category) = lower(site_products.category)
);
