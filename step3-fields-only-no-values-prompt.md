# 只修改 Step3：只比较 Fields，不比较 Values

请只处理当前项目中的 Step3。

## 当前状态

- Step1：旧系统页面采集，已经可以运行
- Step2：新系统页面采集，已经可以运行
- Step3：对比 Step1 和 Step2 的结果

当前问题是：Step1 和 Step2 的原始输出中包含很多页面内容和运行时数据，Step3 把这些内容也参与了比较，导致出现大量无意义差异。

本次只修改 Step3。不要修改 Step1、Step2、Step4～Step9、录制流程、登录、导航或其他公共流程。

Step1 和 Step2 继续保留完整原始采集结果用于排错；Step3 必须在内部先提取 fields，再进行比较。

## 正确处理流程

```text
读取 Step1 原始结果
→ 读取 Step2 原始结果
→ 分别提取 fields
→ 对 fields 做白名单标准化
→ 排除 value 和动态内容
→ 匹配字段
→ 只比较字段结构和定义
→ 输出字段差异
```

禁止直接对 Step1 和 Step2 的完整 JSON 执行 deep diff。

## 第一阶段：只读审计

修改前先输出：

1. Step3 的真实入口文件
2. Step3 当前读取 Step1 和 Step2 输出的位置
3. Step1 和 Step2 中 fields 的真实数据路径
4. 当前使用的比较函数
5. 当前是否对完整 JSON 做 deep diff
6. 当前被错误比较的 key
7. 当前字段匹配规则
8. 计划修改的文件
9. 明确不会修改的文件

先审计，再修改。

## 增加 Fields 提取层

请在 Step3 中增加或复用统一的 fields 提取函数，例如：

```javascript
function extractFields(sourceData) {
  // 从 Step1 或 Step2 原始结果中找到 fields
  // 返回标准化后的字段数组
}
```

要求：

1. 同时兼容 Step1 和 Step2 的真实输出结构
2. 不修改 Step1 和 Step2 的输出
3. 如果两边 fields 路径不同，在 Step3 中做适配
4. 找不到 fields 时输出明确错误
5. 不要把完整页面对象交给比较函数
6. 只返回字段定义

## 采用字段白名单

请使用明确白名单生成标准字段对象。建议结构：

```javascript
{
  fieldKey: "",
  name: "",
  id: "",
  label: "",
  type: "",
  controlType: "",
  required: false,
  readonly: false,
  disabled: false,
  maxLength: null,
  minLength: null,
  min: null,
  max: null,
  pattern: null,
  multiple: false,
  options: [],
  section: "",
  group: "",
  order: null,
  visible: true
}
```

最终白名单必须根据当前项目真实数据结构确定。未进入白名单的属性一律不得参与比较。

## 明确排除 Values 和动态内容

以下内容必须在 Step3 标准化阶段排除：

- value
- currentValue
- defaultValue 中的业务数据
- selectedValue
- selectedText
- displayValue
- input 当前内容
- textarea 当前内容
- 客户号
- 客户姓名
- 地址
- 电话
- 邮箱实际值
- 日期实际值
- 金额实际值
- 账户余额
- 页面动态提示
- 业务结果文本
- innerText
- textContent
- innerHTML
- outerHTML
- 完整 DOM
- screenshot
- timestamp
- session
- token
- cookie
- request 或 response 中的客户数据
- customerData
- runtimeData
- 随机生成内容
- 运行时动态 ID

即使这些 key 出现在 Step1 或 Step2 原始结果中，也不得进入 Step3 diff。

## Options 处理规则

下拉框的 options 定义可以比较，例如：

```javascript
[
  { value: "A", label: "Active" },
  { value: "I", label: "Inactive" }
]
```

但当前选中了哪个值不得比较：

```text
selectedValue
selectedText
value
```

如果 options 顺序没有业务意义，请先标准化排序后再比较。如果成熟模板已有 options 规则，优先复用模板。

## 字段匹配规则

请优先参考现有成熟模板。字段匹配建议优先级：

1. 稳定业务 key
2. 稳定 name
3. 稳定 id
4. 标准化 label
5. section + label
6. group + label
7. controlType + label
8. 已有字段映射配置

动态 id 必须排除。

label 标准化至少包括：

- 去除首尾空格
- 合并连续空格
- 统一大小写
- 去掉非业务性冒号
- 统一常见标点差异

不要仅凭模糊字符串相似度自动认定字段相同。

## Step3 输出要求

Step3 输出只保留字段差异，例如：

```javascript
{
  metadata: {
    comparisonType: "legacy-vs-new",
    oldSource: "step1",
    newSource: "step2"
  },
  summary: {
    oldFieldCount: 0,
    newFieldCount: 0,
    matchedFieldCount: 0,
    addedFieldCount: 0,
    removedFieldCount: 0,
    changedFieldCount: 0,
    unchangedFieldCount: 0
  },
  addedFields: [],
  removedFields: [],
  changedFields: [],
  unchangedFields: []
}
```

`changedFields` 只允许记录字段定义变化。

正确示例：

```javascript
{
  fieldKey: "email",
  changes: {
    required: {
      old: false,
      new: true
    },
    maxLength: {
      old: 50,
      new: 100
    }
  }
}
```

禁止出现：

```javascript
{
  changes: {
    value: {
      old: "Amy",
      new: "John"
    }
  }
}
```

## 实现建议

```javascript
const step1Data = readStep1Output();
const step2Data = readStep2Output();

const oldFields = extractFields(step1Data);
const newFields = extractFields(step2Data);

const normalizedOldFields = oldFields.map(normalizeField);
const normalizedNewFields = newFields.map(normalizeField);

const result = compareFields(
  normalizedOldFields,
  normalizedNewFields
);
```

不要把 `step1Data` 和 `step2Data` 直接传给通用 deep diff。

## 必须增加的测试

### 测试一：字段结构相同，value 不同

旧系统：

```javascript
{
  name: "customerName",
  label: "Customer Name",
  type: "text",
  value: "Amy"
}
```

新系统：

```javascript
{
  name: "customerName",
  label: "Customer Name",
  type: "text",
  value: "John"
}
```

预期：无字段差异。

### 测试二：selectedValue 不同

下拉框字段定义和 options 相同，但当前选中值不同。

预期：无字段差异。

### 测试三：页面动态文本不同

innerText、textContent、timestamp 不同。

预期：无字段差异。

### 测试四：字段新增

新系统多一个字段。

预期：`addedFields` 正确记录新增字段。

### 测试五：字段删除

旧系统有字段，新系统没有。

预期：`removedFields` 正确记录缺失字段。

### 测试六：required 变化

旧系统 `required=false`，新系统 `required=true`。

预期：`changedFields` 只记录 required。

### 测试七：options 定义变化

新系统比旧系统多一个选项。

预期：`changedFields` 记录 options 变化。

### 测试八：动态数据污染

输入中包含 customerData、value、selectedValue、innerText、timestamp、token。

预期：以上内容均不进入 diff。

## 验收标准

只有满足以下条件才算完成：

1. Step1 未修改
2. Step2 未修改
3. Step3 不再对完整 JSON 做 deep diff
4. Step3 先提取 fields，再进行比较
5. value 不进入 diff
6. selectedValue 不进入 diff
7. 页面动态内容不进入 diff
8. 字段新增、删除和属性变化仍能识别
9. 所有测试通过
10. Step3 输出结构稳定

## 修改限制

- 只修改 Step3 及其必要辅助文件
- 不修改 Step1
- 不修改 Step2
- 不修改 Step4～Step9
- 不修改录制流程
- 不删除 Step1 和 Step2 的原始数据
- 不通过删除所有比较逻辑规避问题
- 必须采用 fields 提取和字段白名单
- 必须增加测试
- 先审计，再修改
- 修改范围尽可能小

## 最终输出

请最终输出：

1. Step3 当前误比较 values 的根因
2. Step1 和 Step2 中 fields 的真实路径
3. 新增或复用的 extractFields 函数
4. 最终字段白名单
5. 明确排除的动态 key
6. 字段匹配规则
7. 修改过的文件
8. 新增测试文件
9. 所有测试结果
10. 一个 fields 相同但 value 不同、最终无 diff 的真实示例
11. 尚未解决的问题
12. 明确确认 Step1 和 Step2 未被修改
