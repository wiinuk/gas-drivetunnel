
        // 日時として扱われる数値が混じるとクエリ結果が空になる時があるので、
        // TO_PURE_NUMBER で日時として扱われない数値に変換する。
                )}!A:Z)), ARRAYFORMULA(TO_PURE_NUMBER(${toSheetSheetNameLiteral(
                )}!A:Z))}, ${toSheetStringLiteral(query)})`,
