/**
 * 指令处理类（保留接口，实际实现在 stm32Com.ts）
 */

/**
 * 指令接口
 */
export interface Instruction {
  SendBuffer: number[]
  CRC: number
  Command?: number
  retry?: number
}

