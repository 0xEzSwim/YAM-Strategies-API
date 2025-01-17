export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      Assets: {
        Row: {
          address: string
          createdAt: string
          decimals: number
          isCSMToken: boolean | null
          isERC20: boolean | null
          isStableCoin: boolean | null
          oracleId: number | null
          supply: number
          symbol: string
          updatedAt: string
        }
        Insert: {
          address: string
          createdAt?: string
          decimals?: number
          isCSMToken?: boolean | null
          isERC20?: boolean | null
          isStableCoin?: boolean | null
          oracleId?: number | null
          supply?: number
          symbol: string
          updatedAt?: string
        }
        Update: {
          address?: string
          createdAt?: string
          decimals?: number
          isCSMToken?: boolean | null
          isERC20?: boolean | null
          isStableCoin?: boolean | null
          oracleId?: number | null
          supply?: number
          symbol?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Assets_oracleId_fkey"
            columns: ["oracleId"]
            isOneToOne: false
            referencedRelation: "Oracles"
            referencedColumns: ["id"]
          },
        ]
      }
      Oracles: {
        Row: {
          cmcId: number | null
          createdAt: string
          csmId: number | null
          id: number
          realtId: string | null
          updatedAt: string
        }
        Insert: {
          cmcId?: number | null
          createdAt?: string
          csmId?: number | null
          id?: number
          realtId?: string | null
          updatedAt?: string
        }
        Update: {
          cmcId?: number | null
          createdAt?: string
          csmId?: number | null
          id?: number
          realtId?: string | null
          updatedAt?: string
        }
        Relationships: []
      }
      Strategies: {
        Row: {
          address: string
          contractAbi: Json
          createdAt: string
          description: string
          isPaused: boolean
          name: string
          tvl: number
          underlyingAssetAddress: string
          updatedAt: string
        }
        Insert: {
          address: string
          contractAbi: Json
          createdAt?: string
          description: string
          isPaused: boolean
          name: string
          tvl?: number
          underlyingAssetAddress: string
          updatedAt?: string
        }
        Update: {
          address?: string
          contractAbi?: Json
          createdAt?: string
          description?: string
          isPaused?: boolean
          name?: string
          tvl?: number
          underlyingAssetAddress?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Strategies_address_fkey"
            columns: ["address"]
            isOneToOne: true
            referencedRelation: "Assets"
            referencedColumns: ["address"]
          },
          {
            foreignKeyName: "Strategies_address_fkey"
            columns: ["address"]
            isOneToOne: true
            referencedRelation: "FullStrategies"
            referencedColumns: ["shareAddress"]
          },
          {
            foreignKeyName: "Strategies_address_fkey"
            columns: ["address"]
            isOneToOne: true
            referencedRelation: "FullStrategies"
            referencedColumns: ["underlyingAssetAddress"]
          },
          {
            foreignKeyName: "Strategies_address_fkey"
            columns: ["address"]
            isOneToOne: true
            referencedRelation: "Holdings"
            referencedColumns: ["assetAddress"]
          },
          {
            foreignKeyName: "Strategies_underlyingAssetAddress_fkey"
            columns: ["underlyingAssetAddress"]
            isOneToOne: false
            referencedRelation: "Assets"
            referencedColumns: ["address"]
          },
          {
            foreignKeyName: "Strategies_underlyingAssetAddress_fkey"
            columns: ["underlyingAssetAddress"]
            isOneToOne: false
            referencedRelation: "FullStrategies"
            referencedColumns: ["shareAddress"]
          },
          {
            foreignKeyName: "Strategies_underlyingAssetAddress_fkey"
            columns: ["underlyingAssetAddress"]
            isOneToOne: false
            referencedRelation: "FullStrategies"
            referencedColumns: ["underlyingAssetAddress"]
          },
          {
            foreignKeyName: "Strategies_underlyingAssetAddress_fkey"
            columns: ["underlyingAssetAddress"]
            isOneToOne: false
            referencedRelation: "Holdings"
            referencedColumns: ["assetAddress"]
          },
        ]
      }
      Strategies_Assets: {
        Row: {
          amount: number
          assetAddress: string
          createdAt: string
          strategyAddress: string
          updatedAt: string
          value: number
        }
        Insert: {
          amount?: number
          assetAddress: string
          createdAt?: string
          strategyAddress: string
          updatedAt?: string
          value?: number
        }
        Update: {
          amount?: number
          assetAddress?: string
          createdAt?: string
          strategyAddress?: string
          updatedAt?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "Strategies_Assets_assetAddress_fkey"
            columns: ["assetAddress"]
            isOneToOne: false
            referencedRelation: "Assets"
            referencedColumns: ["address"]
          },
          {
            foreignKeyName: "Strategies_Assets_assetAddress_fkey"
            columns: ["assetAddress"]
            isOneToOne: false
            referencedRelation: "FullStrategies"
            referencedColumns: ["shareAddress"]
          },
          {
            foreignKeyName: "Strategies_Assets_assetAddress_fkey"
            columns: ["assetAddress"]
            isOneToOne: false
            referencedRelation: "FullStrategies"
            referencedColumns: ["underlyingAssetAddress"]
          },
          {
            foreignKeyName: "Strategies_Assets_assetAddress_fkey"
            columns: ["assetAddress"]
            isOneToOne: false
            referencedRelation: "Holdings"
            referencedColumns: ["assetAddress"]
          },
          {
            foreignKeyName: "Strategies_Assets_strategyAddress_fkey"
            columns: ["strategyAddress"]
            isOneToOne: false
            referencedRelation: "Strategies"
            referencedColumns: ["address"]
          },
        ]
      }
    }
    Views: {
      FullStrategies: {
        Row: {
          contractAbi: Json | null
          description: string | null
          isPaused: boolean | null
          name: string | null
          shareAddress: string | null
          shareCmcId: number | null
          shareCsmId: number | null
          shareDecimals: number | null
          shareIsStableCoin: boolean | null
          shareRealtId: string | null
          shareSupply: string | null
          shareSymbol: string | null
          tvl: string | null
          underlyingAssetAddress: string | null
          underlyingAssetCmcId: number | null
          underlyingAssetCsmId: number | null
          underlyingAssetDecimals: number | null
          underlyingAssetIsStableCoin: boolean | null
          underlyingAssetRealtId: string | null
          underlyingAssetSupply: string | null
          underlyingAssetSymbol: string | null
        }
        Relationships: []
      }
      Holdings: {
        Row: {
          assetAddress: string | null
          assetAmount: string | null
          assetAmountDecimals: number | null
          assetSymbol: string | null
          assetValue: string | null
          assetValueDecimals: number | null
          strategyAddress: string | null
          strategyAllocation: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Strategies_Assets_strategyAddress_fkey"
            columns: ["strategyAddress"]
            isOneToOne: false
            referencedRelation: "Strategies"
            referencedColumns: ["address"]
          },
        ]
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
