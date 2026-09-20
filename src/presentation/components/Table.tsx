import type { ReactNode } from 'react'

import styles from './Table.module.css'

export interface TableColumn<T> {
  readonly key: string
  readonly header: string
  readonly render: (row: T) => ReactNode
}

interface TableProps<T> {
  readonly columns: readonly TableColumn<T>[]
  readonly rows: readonly T[]
  readonly getRowKey: (row: T) => string
}

// Se convierte en una lista de tarjetas en pantallas angostas usando solo
// CSS (ver Table.module.css), sin duplicar el markup entre desktop y
// mobile (rule 19).
export function Table<T>({ columns, rows, getRowKey }: TableProps<T>) {
  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowKey(row)}>
              {columns.map((column) => (
                <td key={column.key} data-label={column.header}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
