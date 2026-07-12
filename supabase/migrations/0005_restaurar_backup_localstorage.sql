-- Restauración de emergencia: los datos reales se perdieron (guardado
-- automático sobreescribió Supabase con un estado vacío durante el incidente
-- del cuelgue de la app). Reconstruido a partir de un respaldo encontrado en
-- localStorage ("inv_v9") de un navegador que no llegó a sincronizar el
-- estado vacío. Vuelve a dejar las tablas afectadas en el estado real que
-- tenían al 2026-07-11.

truncate table
  public.lote_movimientos,
  public.lotes,
  public.bancal_slots,
  public.plan_siembra,
  public.historial,
  public.cosechas,
  public.inventario_semillas,
  public.variedades;

-- ── Variedades ──────────────────────────────────────────────────────────
insert into public.variedades (id, nombre, marca, tipo) values
(19, 'Batavia', 'Bajo', 'Lianabel'),
(21, 'Batavia', 'Bejo', 'Sementel'),
(23, 'Lolo Bionda', 'Kijk Zwaan', 'Lozano'),
(25, 'Española', 'Rijk Zwaan', 'Natalia'),
(27, 'Hoja Roble', 'Kijk Zwaan', 'Kimenoz');

-- ── Lotes ───────────────────────────────────────────────────────────────
insert into public.lotes
  (id, variedad_id, plantas_iniciales, plantas_restantes, etapa, fecha_inicio, fecha_etapa, dias_plantines, dias_engorda, dias_adulto, notas, bancal_id, fecha_venta, bandera)
values
(33, 23, 50, 50, 'plantines', '2026-06-25', '2026-06-25', 14, 21, 21, '', null, '2026-08-20', 1),
(36, 23, 50, 50, 'plantines', '2026-06-25', '2026-06-25', 14, 21, 21, '', null, '2026-08-20', 2),
(39, 25, 12, 12, 'plantines', '2026-06-25', '2026-06-25', 14, 21, 21, '', null, '2026-08-20', 3),
(42, 25, 13, 13, 'plantines', '2026-06-25', '2026-06-25', 14, 21, 21, '', null, '2026-08-20', 4),
(45, 27, 12, 12, 'plantines', '2026-06-25', '2026-06-25', 14, 21, 21, '', null, '2026-08-20', 5),
(48, 19, 12, 12, 'plantines', '2026-06-25', '2026-06-25', 14, 21, 21, '', null, '2026-08-20', 6),
(51, 21, 15, 15, 'plantines', '2026-06-25', '2026-06-25', 14, 21, 21, '', null, '2026-08-20', 7),
(54, 23, 50, 50, 'plantines', '2026-07-02', '2026-07-02', 14, 21, 21, '', null, '2026-08-27', 8),
(57, 23, 50, 50, 'plantines', '2026-07-02', '2026-07-02', 14, 21, 21, '', null, '2026-08-27', 9),
(60, 25, 12, 12, 'plantines', '2026-07-02', '2026-07-02', 14, 21, 21, '', null, '2026-08-27', 10),
(63, 25, 12, 12, 'plantines', '2026-07-02', '2026-07-02', 14, 21, 21, '', null, '2026-08-27', 11),
(66, 27, 13, 13, 'plantines', '2026-07-02', '2026-07-02', 14, 21, 21, '', null, '2026-08-27', 12),
(69, 27, 13, 13, 'plantines', '2026-07-02', '2026-07-02', 14, 21, 21, '', null, '2026-08-27', 13),
(72, 19, 7, 7, 'plantines', '2026-07-02', '2026-07-02', 14, 21, 21, '', null, '2026-08-27', 14),
(75, 21, 8, 8, 'plantines', '2026-07-02', '2026-07-02', 14, 21, 21, '', null, '2026-08-27', 15),
(78, 23, 50, 50, 'plantines', '2026-07-03', '2026-07-03', 14, 21, 21, '', null, '2026-08-28', 16),
(81, 23, 50, 50, 'plantines', '2026-07-03', '2026-07-03', 14, 21, 21, '', null, '2026-08-28', 17),
(84, 25, 12, 12, 'plantines', '2026-07-03', '2026-07-03', 14, 21, 21, '', null, '2026-08-28', 18),
(87, 25, 12, 12, 'plantines', '2026-07-03', '2026-07-03', 14, 21, 21, '', null, '2026-08-28', 19),
(90, 27, 12, 12, 'plantines', '2026-07-03', '2026-07-03', 14, 21, 21, '', null, '2026-08-28', 20),
(93, 27, 12, 12, 'plantines', '2026-07-03', '2026-07-03', 14, 21, 21, '', null, '2026-08-28', 21),
(96, 19, 15, 15, 'plantines', '2026-07-03', '2026-07-03', 14, 21, 21, '', null, '2026-08-28', 22),
(100, 21, 15, 15, 'plantines', '2026-07-08', '2026-07-08', 14, 21, 21, '', null, '2026-09-02', 23),
(103, 21, 13, 13, 'plantines', '2026-06-25', '2026-06-25', 14, 21, 21, '', null, '2026-08-20', 24),
(121, 19, 50, 50, 'plantines', '2026-07-08', '2026-07-08', 14, 21, 21, '', null, '2026-09-02', 25),
(124, 27, 55, 55, 'plantines', '2026-07-08', '2026-07-08', 14, 21, 21, '', null, '2026-09-02', 28),
(127, 25, 55, 55, 'plantines', '2026-07-08', '2026-07-08', 14, 21, 21, '', null, '2026-09-02', 27),
(130, 23, 155, 155, 'plantines', '2026-07-08', '2026-07-08', 14, 21, 21, '', null, '2026-09-02', 26),
(147, 23, 160, 160, 'plantines', '2026-07-10', '2026-07-10', 20, 21, 21, '', null, '2026-09-09', 30),
(150, 27, 70, 70, 'plantines', '2026-07-10', '2026-07-10', 20, 21, 21, '', null, '2026-09-09', 29),
(153, 25, 70, 70, 'plantines', '2026-07-10', '2026-07-10', 20, 21, 21, '', null, '2026-09-09', 31);

-- ── Movimientos por lote ─────────────────────────────────────────────────
insert into public.lote_movimientos (id, lote_id, fecha, accion, detalle, autor) values
(34, 33, '2026-06-25', 'Siembra', '50 plantas (1.67 tubos)', 'Ignacio Asfura92'),
(37, 36, '2026-06-25', 'Siembra', '50 plantas (1.67 tubos)', 'Ignacio Asfura92'),
(40, 39, '2026-06-25', 'Siembra', '12 plantas (0.4 tubos)', 'Ignacio Asfura92'),
(43, 42, '2026-06-25', 'Siembra', '13 plantas (0.43 tubos)', 'Ignacio Asfura92'),
(46, 45, '2026-06-25', 'Siembra', '12 plantas (0.4 tubos)', 'Ignacio Asfura92'),
(49, 48, '2026-06-25', 'Siembra', '12 plantas (0.4 tubos)', 'Ignacio Asfura92'),
(52, 51, '2026-06-25', 'Siembra', '15 plantas (0.5 tubos)', 'Ignacio Asfura92'),
(55, 54, '2026-07-02', 'Siembra', '50 plantas (1.67 tubos)', 'Ignacio Asfura92'),
(58, 57, '2026-07-02', 'Siembra', '50 plantas (1.67 tubos)', 'Ignacio Asfura92'),
(61, 60, '2026-07-02', 'Siembra', '12 plantas (0.4 tubos)', 'Ignacio Asfura92'),
(64, 63, '2026-07-02', 'Siembra', '12 plantas (0.4 tubos)', 'Ignacio Asfura92'),
(67, 66, '2026-07-02', 'Siembra', '13 plantas (0.43 tubos)', 'Ignacio Asfura92'),
(70, 69, '2026-07-02', 'Siembra', '13 plantas (0.43 tubos)', 'Ignacio Asfura92'),
(73, 72, '2026-07-02', 'Siembra', '7 plantas (0.23 tubos)', 'Ignacio Asfura92'),
(76, 75, '2026-07-02', 'Siembra', '8 plantas (0.27 tubos)', 'Ignacio Asfura92'),
(79, 78, '2026-07-03', 'Siembra', '50 plantas (1.67 tubos)', 'Ignacio Asfura92'),
(82, 81, '2026-07-03', 'Siembra', '50 plantas (1.67 tubos)', 'Ignacio Asfura92'),
(85, 84, '2026-07-03', 'Siembra', '12 plantas (0.4 tubos)', 'Ignacio Asfura92'),
(88, 87, '2026-07-03', 'Siembra', '12 plantas (0.4 tubos)', 'Ignacio Asfura92'),
(91, 90, '2026-07-03', 'Siembra', '12 plantas (0.4 tubos)', 'Ignacio Asfura92'),
(94, 93, '2026-07-03', 'Siembra', '12 plantas (0.4 tubos)', 'Ignacio Asfura92'),
(97, 96, '2026-07-03', 'Siembra', '15 plantas (0.5 tubos)', 'Ignacio Asfura92'),
(101, 100, '2026-07-08', 'Siembra', '15 plantas (0.5 tubos)', 'Ignacio Asfura92'),
(104, 103, '2026-06-25', 'Siembra', '13 plantas (0.43 tubos)', 'Ignacio Asfura92'),
(122, 121, '2026-07-08', 'Siembra', '50 plantas (1.67 tubos)', 'Ignacio Asfura92'),
(125, 124, '2026-07-08', 'Siembra', '55 plantas (1.83 tubos)', 'Ignacio Asfura92'),
(128, 127, '2026-07-08', 'Siembra', '55 plantas (1.83 tubos)', 'Ignacio Asfura92'),
(131, 130, '2026-07-08', 'Siembra', '155 plantas (5.17 tubos)', 'Ignacio Asfura92'),
(148, 147, '2026-07-10', 'Siembra', '160 plantas (5.33 tubos)', 'Ignacio Asfura92'),
(151, 150, '2026-07-10', 'Siembra', '70 plantas (2.33 tubos)', 'Ignacio Asfura92'),
(154, 153, '2026-07-10', 'Siembra', '70 plantas (2.33 tubos)', 'Ignacio Asfura92');

-- ── Plan de siembra ─────────────────────────────────────────────────────
insert into public.plan_siembra (id, variedad_id, frecuencia_dias, plantas, dias_plantines, dias_engorda, dias_adulto, ultima_siembra) values
(109, 19, 2, 35, 20, 21, 21, '2026-07-08'),
(115, 23, 2, 160, 20, 21, 21, '2026-07-10'),
(117, 25, 2, 65, 20, 21, 21, '2026-07-10'),
(119, 27, 2, 65, 20, 21, 21, '2026-07-10'),
(156, 19, 2, 35, 20, 20, 20, null);

-- ── Inventario ──────────────────────────────────────────────────────────
update public.inventario_cubos set cantidad = 5217 where id = 1;

insert into public.inventario_semillas (variedad_id, cantidad) values
(19, 9916),
(21, 9949),
(23, 385),
(25, 802),
(27, 813);

-- ── Merma (ya en 0, se deja explícito) ───────────────────────────────────
update public.merma set cantidad = 0;

-- ── Historial global ────────────────────────────────────────────────────
insert into public.historial (id, fecha, accion, detalle, autor) values
(157, '2026-07-12', 'Plan', 'Batavia cada 2d', null),
(155, '2026-07-10', 'Siembra', '70 plantas (2.33 tubos) de Española — 10/07/2026', 'Ignacio Asfura92'),
(152, '2026-07-10', 'Siembra', '70 plantas (2.33 tubos) de Hoja Roble — 10/07/2026', 'Ignacio Asfura92'),
(149, '2026-07-10', 'Siembra', '160 plantas (5.33 tubos) de Lolo Bionda — 10/07/2026', 'Ignacio Asfura92'),
(146, '2026-07-09', 'Plan editado', 'Hoja Roble cada 2d', null),
(145, '2026-07-09', 'Plan editado', 'Española cada 2d', null),
(144, '2026-07-09', 'Plan editado', 'Española cada 2d', null),
(143, '2026-07-09', 'Plan editado', 'Batavia cada 2d', null),
(142, '2026-07-09', 'Plan editado', 'Hoja Roble cada 2d', null),
(141, '2026-07-09', 'Plan editado', 'Española cada 2d', null),
(140, '2026-07-09', 'Plan editado', 'Lolo Bionda cada 2d', null),
(139, '2026-07-09', 'Plan editado', 'Hoja Roble cada 2d', null),
(138, '2026-07-09', 'Plan editado', 'Española cada 2d', null),
(137, '2026-07-09', 'Plan editado', 'Lolo Bionda cada 2d', null),
(136, '2026-07-09', 'Plan editado', 'Batavia cada 2d', null),
(135, '2026-07-09', 'Plan editado', 'Hoja Roble cada 2d', null),
(134, '2026-07-09', 'Plan editado', 'Española cada 2d', null),
(133, '2026-07-09', 'Plan editado', 'Lolo Bionda cada 2d', null),
(132, '2026-07-08', 'Siembra', '155 plantas (5.17 tubos) de Lolo Bionda — 08/07/2026', 'Ignacio Asfura92'),
(129, '2026-07-08', 'Siembra', '55 plantas (1.83 tubos) de Española — 08/07/2026', 'Ignacio Asfura92'),
(126, '2026-07-08', 'Siembra', '55 plantas (1.83 tubos) de Hoja Roble — 08/07/2026', 'Ignacio Asfura92'),
(123, '2026-07-08', 'Siembra', '50 plantas (1.67 tubos) de Batavia — 08/07/2026', 'Ignacio Asfura92'),
(120, '2026-07-08', 'Plan', 'Hoja Roble cada 7d', null),
(118, '2026-07-08', 'Plan', 'Española cada 7d', null),
(116, '2026-07-08', 'Plan', 'Lolo Bionda cada 7d', null),
(114, '2026-07-08', 'Plan', 'Hoja Roble cada 2d', null),
(112, '2026-07-08', 'Plan', 'Española cada 2d', null),
(110, '2026-07-08', 'Plan', 'Batavia cada 2d', null),
(108, '2026-07-08', 'Plan', 'Lolo Bionda cada 2d', null),
(106, '2026-07-08', 'Cubos', '+5352', null),
(105, '2026-07-08', 'Siembra', '13 plantas (0.43 tubos) de Batavia — 25/06/2026', 'Ignacio Asfura92'),
(102, '2026-07-08', 'Siembra', '15 plantas (0.5 tubos) de Batavia — 08/07/2026', 'Ignacio Asfura92'),
(99, '2026-07-08', 'Cubos', '+500', null),
(98, '2026-07-08', 'Siembra', '15 plantas (0.5 tubos) de Batavia — 03/07/2026', 'Ignacio Asfura92'),
(95, '2026-07-08', 'Siembra', '12 plantas (0.4 tubos) de Hoja Roble — 03/07/2026', 'Ignacio Asfura92'),
(92, '2026-07-08', 'Siembra', '12 plantas (0.4 tubos) de Hoja Roble — 03/07/2026', 'Ignacio Asfura92'),
(89, '2026-07-08', 'Siembra', '12 plantas (0.4 tubos) de Española — 03/07/2026', 'Ignacio Asfura92'),
(86, '2026-07-08', 'Siembra', '12 plantas (0.4 tubos) de Española — 03/07/2026', 'Ignacio Asfura92'),
(83, '2026-07-08', 'Siembra', '50 plantas (1.67 tubos) de Lolo Bionda — 03/07/2026', 'Ignacio Asfura92'),
(80, '2026-07-08', 'Siembra', '50 plantas (1.67 tubos) de Lolo Bionda — 03/07/2026', 'Ignacio Asfura92'),
(77, '2026-07-08', 'Siembra', '8 plantas (0.27 tubos) de Batavia — 02/07/2026', 'Ignacio Asfura92'),
(74, '2026-07-08', 'Siembra', '7 plantas (0.23 tubos) de Batavia — 02/07/2026', 'Ignacio Asfura92'),
(71, '2026-07-08', 'Siembra', '13 plantas (0.43 tubos) de Hoja Roble — 02/07/2026', 'Ignacio Asfura92'),
(68, '2026-07-08', 'Siembra', '13 plantas (0.43 tubos) de Hoja Roble — 02/07/2026', 'Ignacio Asfura92'),
(65, '2026-07-08', 'Siembra', '12 plantas (0.4 tubos) de Española — 02/07/2026', 'Ignacio Asfura92'),
(62, '2026-07-08', 'Siembra', '12 plantas (0.4 tubos) de Española — 02/07/2026', 'Ignacio Asfura92'),
(59, '2026-07-08', 'Siembra', '50 plantas (1.67 tubos) de Lolo Bionda — 02/07/2026', 'Ignacio Asfura92'),
(56, '2026-07-08', 'Siembra', '50 plantas (1.67 tubos) de Lolo Bionda — 02/07/2026', 'Ignacio Asfura92'),
(53, '2026-07-08', 'Siembra', '15 plantas (0.5 tubos) de Batavia — 25/06/2026', 'Ignacio Asfura92'),
(50, '2026-07-08', 'Siembra', '12 plantas (0.4 tubos) de Batavia — 25/06/2026', 'Ignacio Asfura92'),
(47, '2026-07-08', 'Siembra', '12 plantas (0.4 tubos) de Hoja Roble — 25/06/2026', 'Ignacio Asfura92'),
(44, '2026-07-08', 'Siembra', '13 plantas (0.43 tubos) de Española — 25/06/2026', 'Ignacio Asfura92'),
(41, '2026-07-08', 'Siembra', '12 plantas (0.4 tubos) de Española — 25/06/2026', 'Ignacio Asfura92'),
(38, '2026-07-08', 'Siembra', '50 plantas (1.67 tubos) de Lolo Bionda — 25/06/2026', 'Ignacio Asfura92'),
(35, '2026-07-08', 'Siembra', '50 plantas (1.67 tubos) de Lolo Bionda — 25/06/2026', 'Ignacio Asfura92'),
(32, '2026-07-08', 'Semillas', 'Batavia +10000', null),
(31, '2026-07-08', 'Semillas', 'Batavia +10000', null),
(30, '2026-07-08', 'Semillas', 'Lolo Bionda +1000', null),
(29, '2026-07-08', 'Semillas', 'Española +1000', null),
(28, '2026-07-08', 'Semillas', 'Hoja Roble +1000', null);
