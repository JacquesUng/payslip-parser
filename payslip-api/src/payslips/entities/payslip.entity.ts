import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('payslips')
export class Payslip {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string;

  @Column('int')
  month!: number;

  @Column('int')
  year!: number;

  @Column()
  company!: string;

  @Column('int', { default: 0 })
  orderIndex!: number;

  @Column()
  storedFileName!: string;

  @Column()
  originalFileName!: string;

  @Column()
  mimeType!: string;

  @Column('int')
  fileSize!: number;

  @CreateDateColumn()
  createdAt!: Date;
}
