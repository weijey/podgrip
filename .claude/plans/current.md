# Plan: 开源贡献路径 A — nushell + youki 深度实践

## 问题基线

- **谁**：有 C/Rust 基础、CS 理论有但实践少的开发者
- **场景**：想通过高难度开源项目全面提升 CS 基础（OS 底层 + 编译器/运行时）
- **痛苦**：理论知识无法转化为实际工程能力，缺乏大型项目经验
- **现状**：已有 fastfetch 2 个 PR（等待 review）、htop 代码写好（本地分支）、radare2 已 fork

## 调研发现

### nushell 关键数据

| 维度              | 数据                                                                  |
| ----------------- | --------------------------------------------------------------------- |
| Stars             | ~35k                                                                  |
| 语言              | Rust (edition 2024, toolchain 1.94.1)                                 |
| AI 政策           | 无限制                                                                |
| Good first issues | 12 个，其中 #17257 标了 `status:ready-to-implement`                   |
| Review 周期       | 文档类当天合并，bug fix 1-2 周，行为变更可达数月                      |
| 合并策略          | squash merge                                                          |
| 社区              | 非常友好，Discord 活跃，维护者 fdncred 当天 review                    |
| 核心 crate        | `nu-command`（最佳切入点）> `nu-protocol` > `nu-parser` > `nu-engine` |
| 代码风格          | 禁止 unwrap/unsafe/自定义宏/println，追求可读性                       |
| 测试              | `cargo test --workspace`，`toolkit check pr` 一键检查                 |

**最佳切入点**：#9573（help 文档不一致 meta-issue）— PR #18338 证明当天可合并
**次佳切入点**：#17257（symlink 补全）— 唯一标了 ready-to-implement

### youki 关键数据

| 维度              | 数据                                                                  |
| ----------------- | --------------------------------------------------------------------- |
| Stars             | ~6k                                                                   |
| 语言              | Rust (edition 2024, toolchain 1.92.0)                                 |
| AI 政策           | 无限制                                                                |
| Good first issues | 12 个，7 个未认领                                                     |
| Review 周期       | 小 fix 几小时，语义变更 4-7 天                                        |
| 合并策略          | 标准 merge                                                            |
| 社区              | 日本团队主导，utam0k 创始人 review，英文为主                          |
| 核心模块          | `libcontainer`（容器生命周期）> `libcgroups`（cgroups）> `liboci-cli` |
| 代码风格          | `cargo +nightly fmt`，anyhow 错误处理，错误消息全小写无句号           |
| 构建              | `just`（替代 Makefile）                                               |
| OCI 覆盖          | namespaces, cgroups, seccomp, capabilities, rootfs, tty, apparmor     |

**最佳切入点**：#3529（提取 C/R terminal spawn 逻辑）— 纯重构，0 评论，无人认领
**备选切入点**：#3533（aarch64 CI 支持）— CI 配置修改，低门槛

## 方案：分阶段执行

### Phase 1: nushell 首 PR（Week 1-2）

**目标**：完成 1-2 个被合并的 PR，建立 Rust 大型项目贡献经验

**Step 1: 环境准备（2 小时）**

```bash
gh repo fork nushell/nushell --clone
cd nushell
cargo build                    # 验证编译
cargo test --workspace         # 验证测试（耗时较长）
```

**Step 2: 首 PR — #9573 子项（2-3 天）**

1. 装好 nushell，对比某个命令的 help example 和实际输出
2. 修 example 文本，加测试
3. 本地跑通 `cargo fmt` + `cargo clippy` + `cargo test`
4. 提 PR，标题 `docs: fix help example for \`command_name\``
5. 期望：当天或次日合并

**Step 3: 进阶 PR — #17257 或其他（Week 2）**

- #17257：symlink 目录补全，涉及 `nu-cli` 补全系统
- 或从 #9573 再挑一个子项

**避开**：`nu-parser` / `nu-engine`（太深）、新依赖（审查极严）、unsafe/宏

### Phase 2: youki 首 PR（Week 3-4）

**目标**：完成 1 个被合并的 PR，开始接触 OS 底层概念

**Step 1: 环境准备（2 小时）**

```bash
gh repo fork youki-dev/youki --clone
cd youki
sudo apt-get install libseccomp-dev libsystemd-dev libdbus-1-dev
cargo install just
just build
just test-unit
```

**Step 2: 首 PR — #3529（3-5 天）**

1. 在 Issue 下评论 "I'd like to work on this"
2. 读 `tests/contest/contest/src/tests/checkpoint_restore/mod.rs`，理解 CrTestContext::start 的 terminal spawn 逻辑
3. 提取到 `tests/contest/contest/src/utils/test_utils.rs`
4. 本地 `just test-unit` 通过
5. 提 PR，标题 `refactor(tests): extract C/R terminal spawn logic into test_utils`

**Step 3: 进阶 PR — #3533 或 #279（Week 4+）**

- #3533：aarch64 CI 支持
- #279：提高 libcontainer 代码覆盖率到 75%（长期任务）

**避开**：已认领的 issue（#3259, #3139, #3001, #2417, #902）

## 验证标准

- [ ] nushell 首 PR 被合并
- [ ] nushell 进阶 PR 被合并或获得 positive review
- [ ] youki 首 PR 被合并
- [ ] 本地能跑通两个项目的完整测试套件
- [ ] 理解 nushell 的 parser → command → engine 执行流程
- [ ] 理解 youki 的 clone → namespace → pivot_root → exec 容器创建流程

## 风险与缓解

| 风险                           | 缓解                                       |
| ------------------------------ | ------------------------------------------ |
| nushell 编译慢（大 workspace） | 用 `cargo test -p nu-command` 只跑单 crate |
| youki 集成测试需要 sudo/root   | 先只跑 `just test-unit`，集成测试用 CI     |
| Issue 被别人抢先认领           | 保持 2-3 个备选 issue                      |
| Review 周期长导致失去动力      | nushell 文档类 PR 当天合并，先拿正反馈     |
