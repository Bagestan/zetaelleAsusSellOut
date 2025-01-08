# TArticoli (produtos)

    - IDArticolo (pk)
    - Desc

# TDocRighe (vendas)

    - IDDocRiga (pk)
    - IDDoc
    - IDArticoloScaricato
    - Qta
    - MovMagazz

# TArticoliMagazz (estoque)

    - IDArticolo (TArticoli) (pk)
    - QtaCaricata
    - QtaScaricata
    - QtaInArrivo

# TMovMagazz (movimentação de estoque)

    - IDMovMaga (pk)
    - IDArticolo (TArticoli)
    - Data
    - QtaCaricata
    - QtaScaricata
    - IDDocRiga
