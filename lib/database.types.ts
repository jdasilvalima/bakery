
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "deliveries": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"invoice_number": string,"received_by": string,"received_on": string,"supplier_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"invoice_number": string,"received_by": string,"received_on": string,"supplier_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"invoice_number"?: string,"received_by"?: string,"received_on"?: string,"supplier_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "deliveries_received_by_fkey"
      columns: ["received_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deliveries_supplier_id_fkey"
      columns: ["supplier_id"]
isOneToOne: false
      referencedRelation: "suppliers"
      referencedColumns: ["id"]
    }
                  ]
                },"ingredients": {
                  Row: {
                    "allergens": (string)[],"created_at": string,"id": string,"lot_tracked": boolean,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "allergens"?: (string)[],"created_at"?: string,"id"?: string,"lot_tracked"?: boolean,"name": string
                  }
                  Update: {
                    "allergens"?: (string)[],"created_at"?: string,"id"?: string,"lot_tracked"?: boolean,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"lot_inputs": {
                  Row: {
                    "created_at": string,"id": string,"input_lot_id": string,"output_lot_id": string,"quantity": number,"unit": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"input_lot_id": string,"output_lot_id": string,"quantity": number,"unit": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"input_lot_id"?: string,"output_lot_id"?: string,"quantity"?: number,"unit"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lot_inputs_input_lot_id_fkey"
      columns: ["input_lot_id"]
isOneToOne: false
      referencedRelation: "lot_details"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lot_inputs_input_lot_id_fkey"
      columns: ["input_lot_id"]
isOneToOne: false
      referencedRelation: "lots"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lot_inputs_output_lot_id_fkey"
      columns: ["output_lot_id"]
isOneToOne: false
      referencedRelation: "lot_details"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lot_inputs_output_lot_id_fkey"
      columns: ["output_lot_id"]
isOneToOne: false
      referencedRelation: "lots"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lot_inputs_unit_fkey"
      columns: ["unit"]
isOneToOne: false
      referencedRelation: "units"
      referencedColumns: ["code"]
    }
                  ]
                },"lots": {
                  Row: {
                    "created_at": string,"delivery_id": string | null,"expires_on": string | null,"id": string,"kind": Database["public"]['Enums']["lot_kind"],"lot_code": string,"material_id": string | null,"product_id": string | null,"production_id": string | null,"quantity": number,"recipe_version_id": string | null,"unit": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"delivery_id"?: string | null,"expires_on"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["lot_kind"],"lot_code": string,"material_id"?: string | null,"product_id"?: string | null,"production_id"?: string | null,"quantity": number,"recipe_version_id"?: string | null,"unit": string
                  }
                  Update: {
                    "created_at"?: string,"delivery_id"?: string | null,"expires_on"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["lot_kind"],"lot_code"?: string,"material_id"?: string | null,"product_id"?: string | null,"production_id"?: string | null,"quantity"?: number,"recipe_version_id"?: string | null,"unit"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lots_delivery_id_fkey"
      columns: ["delivery_id"]
isOneToOne: false
      referencedRelation: "deliveries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lots_material_id_fkey"
      columns: ["material_id"]
isOneToOne: false
      referencedRelation: "materials"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lots_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lots_production_id_fkey"
      columns: ["production_id"]
isOneToOne: true
      referencedRelation: "bake_ccp_checks"
      referencedColumns: ["production_id"]
    },{
      foreignKeyName: "lots_production_id_fkey"
      columns: ["production_id"]
isOneToOne: true
      referencedRelation: "productions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lots_recipe_version_id_fkey"
      columns: ["recipe_version_id"]
isOneToOne: false
      referencedRelation: "recipe_versions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lots_unit_fkey"
      columns: ["unit"]
isOneToOne: false
      referencedRelation: "units"
      referencedColumns: ["code"]
    }
                  ]
                },"materials": {
                  Row: {
                    "active": boolean,"base_unit": string,"code": string,"created_at": string,"id": string,"ingredient_id": string | null,"kind": Database["public"]['Enums']["material_kind"],"name": string,"package_unit": string,"qty_per_package": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"base_unit": string,"code": string,"created_at"?: string,"id"?: string,"ingredient_id"?: string | null,"kind": Database["public"]['Enums']["material_kind"],"name": string,"package_unit": string,"qty_per_package": number
                  }
                  Update: {
                    "active"?: boolean,"base_unit"?: string,"code"?: string,"created_at"?: string,"id"?: string,"ingredient_id"?: string | null,"kind"?: Database["public"]['Enums']["material_kind"],"name"?: string,"package_unit"?: string,"qty_per_package"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "materials_base_unit_fkey"
      columns: ["base_unit"]
isOneToOne: false
      referencedRelation: "units"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "materials_ingredient_id_fkey"
      columns: ["ingredient_id"]
isOneToOne: false
      referencedRelation: "ingredients"
      referencedColumns: ["id"]
    }
                  ]
                },"productions": {
                  Row: {
                    "bake_minutes": number | null,"bake_temperature_f": number | null,"batches": number | null,"comment": string | null,"created_at": string,"created_by": string | null,"ended_at": string | null,"id": string,"kind": Database["public"]['Enums']["production_kind"],"operator_id": string,"produced_on": string,"product_id": string | null,"recipe_version_id": string | null,"started_at": string | null,"waste_lbs": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "bake_minutes"?: number | null,"bake_temperature_f"?: number | null,"batches"?: number | null,"comment"?: string | null,"created_at"?: string,"created_by"?: string | null,"ended_at"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["production_kind"],"operator_id": string,"produced_on": string,"product_id"?: string | null,"recipe_version_id"?: string | null,"started_at"?: string | null,"waste_lbs"?: number | null
                  }
                  Update: {
                    "bake_minutes"?: number | null,"bake_temperature_f"?: number | null,"batches"?: number | null,"comment"?: string | null,"created_at"?: string,"created_by"?: string | null,"ended_at"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["production_kind"],"operator_id"?: string,"produced_on"?: string,"product_id"?: string | null,"recipe_version_id"?: string | null,"started_at"?: string | null,"waste_lbs"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "productions_operator_id_fkey"
      columns: ["operator_id"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "productions_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "productions_recipe_version_id_fkey"
      columns: ["recipe_version_id"]
isOneToOne: false
      referencedRelation: "recipe_versions"
      referencedColumns: ["id"]
    }
                  ]
                },"products": {
                  Row: {
                    "active": boolean,"category": Database["public"]['Enums']["product_category"],"created_at": string,"id": string,"min_bake_minutes": number | null,"min_bake_temperature_f": number | null,"name": string,"shelf_life_days": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"category": Database["public"]['Enums']["product_category"],"created_at"?: string,"id"?: string,"min_bake_minutes"?: number | null,"min_bake_temperature_f"?: number | null,"name": string,"shelf_life_days"?: number | null
                  }
                  Update: {
                    "active"?: boolean,"category"?: Database["public"]['Enums']["product_category"],"created_at"?: string,"id"?: string,"min_bake_minutes"?: number | null,"min_bake_temperature_f"?: number | null,"name"?: string,"shelf_life_days"?: number | null
                  }
                  Relationships: [
                    
                  ]
                },"recipe_lines": {
                  Row: {
                    "id": string,"ingredient_id": string,"quantity_per_batch": number,"recipe_version_id": string,"unit": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"ingredient_id": string,"quantity_per_batch": number,"recipe_version_id": string,"unit": string
                  }
                  Update: {
                    "id"?: string,"ingredient_id"?: string,"quantity_per_batch"?: number,"recipe_version_id"?: string,"unit"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "recipe_lines_ingredient_id_fkey"
      columns: ["ingredient_id"]
isOneToOne: false
      referencedRelation: "ingredients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recipe_lines_recipe_version_id_fkey"
      columns: ["recipe_version_id"]
isOneToOne: false
      referencedRelation: "recipe_versions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recipe_lines_unit_fkey"
      columns: ["unit"]
isOneToOne: false
      referencedRelation: "units"
      referencedColumns: ["code"]
    }
                  ]
                },"recipe_versions": {
                  Row: {
                    "created_at": string,"id": string,"recipe_id": string,"retired_at": string | null,"version_label": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"recipe_id": string,"retired_at"?: string | null,"version_label": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"recipe_id"?: string,"retired_at"?: string | null,"version_label"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "recipe_versions_recipe_id_fkey"
      columns: ["recipe_id"]
isOneToOne: false
      referencedRelation: "recipes"
      referencedColumns: ["id"]
    }
                  ]
                },"recipes": {
                  Row: {
                    "category": Database["public"]['Enums']["recipe_category"],"created_at": string,"id": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category": Database["public"]['Enums']["recipe_category"],"created_at"?: string,"id"?: string,"name": string
                  }
                  Update: {
                    "category"?: Database["public"]['Enums']["recipe_category"],"created_at"?: string,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"staff": {
                  Row: {
                    "active": boolean,"created_at": string,"display_name": string,"id": string,"role": Database["public"]['Enums']["staff_role"],"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"display_name": string,"id"?: string,"role"?: Database["public"]['Enums']["staff_role"],"user_id"?: string | null
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"display_name"?: string,"id"?: string,"role"?: Database["public"]['Enums']["staff_role"],"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"suppliers": {
                  Row: {
                    "active": boolean,"created_at": string,"id": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"id"?: string,"name": string
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"units": {
                  Row: {
                    "code": string,"dimension": string,"to_base": number
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"dimension": string,"to_base": number
                  }
                  Update: {
                    "code"?: string,"dimension"?: string,"to_base"?: number
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "bake_ccp_checks": {
                  Row: {
                    "bake_minutes": number | null,"bake_temperature_f": number | null,"deviation": boolean | null,"lot_code": string | null,"min_bake_minutes": number | null,"min_bake_temperature_f": number | null,"missing_record": boolean | null,"produced_on": string | null,"product_name": string | null,"production_id": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"lot_details": {
                  Row: {
                    "delivery_id": string | null,"expires_on": string | null,"id": string | null,"ingredient_id": string | null,"invoice_number": string | null,"item_name": string | null,"kind": Database["public"]['Enums']["lot_kind"] | null,"lot_code": string | null,"made_on": string | null,"product_id": string | null,"production_id": string | null,"quantity": number | null,"remaining": number | null,"supplier_name": string | null,"unit": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "lots_delivery_id_fkey"
      columns: ["delivery_id"]
isOneToOne: false
      referencedRelation: "deliveries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lots_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lots_production_id_fkey"
      columns: ["production_id"]
isOneToOne: true
      referencedRelation: "bake_ccp_checks"
      referencedColumns: ["production_id"]
    },{
      foreignKeyName: "lots_production_id_fkey"
      columns: ["production_id"]
isOneToOne: true
      referencedRelation: "productions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lots_unit_fkey"
      columns: ["unit"]
isOneToOne: false
      referencedRelation: "units"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "materials_ingredient_id_fkey"
      columns: ["ingredient_id"]
isOneToOne: false
      referencedRelation: "ingredients"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "assert_staff_role":
{ Args: { "p_allowed": (Database["public"]['Enums']["staff_role"])[] }; Returns: undefined
                           },
"convert_qty":
{ Args: { "p_from": string,"p_qty": number,"p_to": string }; Returns: number
                           },
"current_staff_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"current_staff_role":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["staff_role"]
                           },
"next_lot_code":
{ Args: { "p_on": string,"p_prefix": string }; Returns: string
                           },
"record_delivery":
{ Args: { "p_invoice_number": string,"p_lines": Json,"p_received_by": string,"p_received_on": string,"p_supplier_id": string }; Returns: string
                           },
"record_production":
{ Args: { "p_details"?: Json,"p_inputs": Json,"p_kind": Database["public"]['Enums']["production_kind"],"p_operator_id": string,"p_output": Json,"p_produced_on": string }; Returns: string
                           },
"trace_backward":
{ Args: { "p_lot_id": string }; Returns: {
              "depth": number,"expires_on": string,"item_name": string,"kind": Database["public"]['Enums']["lot_kind"],"lot_code": string,"lot_id": string,"made_on": string,"quantity": number,"unit": string
            }[]
                           },
"trace_forward":
{ Args: { "p_lot_id": string }; Returns: {
              "depth": number,"expires_on": string,"item_name": string,"kind": Database["public"]['Enums']["lot_kind"],"lot_code": string,"lot_id": string,"made_on": string,"quantity": number,"unit": string
            }[]
                           }
          }
          Enums: {
            "lot_kind": "raw_material"|"packaging"|"wip"|"finished"|"packed","material_kind": "raw_material"|"packaging","product_category": "pie"|"cookie"|"other","production_kind": "wip_batch"|"pie_bake"|"cookie_deposit"|"packaging","recipe_category": "dough"|"filling"|"topping"|"cookie_dough"|"other","staff_role": "owner"|"manager"|"operator"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "lot_kind": ["raw_material", "packaging", "wip", "finished", "packed"],"material_kind": ["raw_material", "packaging"],"product_category": ["pie", "cookie", "other"],"production_kind": ["wip_batch", "pie_bake", "cookie_deposit", "packaging"],"recipe_category": ["dough", "filling", "topping", "cookie_dough", "other"],"staff_role": ["owner", "manager", "operator"]
          }
        }
} as const
