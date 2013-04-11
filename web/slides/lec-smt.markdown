% SMT: Satisfiability Modulo Theories 
% Ranjit Jhala, UC San Diego 
% April 9, 2013

## Decision Procedures 

### Last Time

- Propositional Logic

### Today 

1. **Combining** SAT *and Theory* Solvers

2. **Theory Solvers**
    
    - Theory of *Equality*
    - Theory of *Uninterpreted Functions*
    - Theory of *Difference-Bounded Arithmetic*

## Combining SAT and Theory Solvers

![SMT Solver Architecture](../static/smt-solver-empty.png)


## Combining SAT and Theory Solvers

**Goal** Determine if a formula `f` is *Satisfiable*.

~~~~~{.haskell}
data Formula = Prop PVar        -- ^ Prop Logic
             | And  [Formula]   -- ^ "" 
             | Or   [Formula]   -- ^ ""
             | Not  Formula     -- ^ ""
             | Atom Atom        -- ^ Theory Relation 
~~~~~

Where theory elements are described by

~~~~~{.haskell}
data Expr    = Var TVar | Con Int | Op  Operator [Expr]

data Atom    = Rel Relation [Expr]
~~~~~

## Split `Formula` into CNF + Theory Components

### CNF Formulas

~~~~~{.haskell}
data Literal    = Pos PVar | Neg PVar 
type Clause     = [Literal]
type CnfFormula = [Clause]
~~~~~

## Split `Formula` into CNF + Theory Components

### Theory Cube

A `TheoryCube` is an indexed list of `Atom`

~~~~~{.haskell}
data TheoryCube a  = [(a, Atom)]
~~~~~

### Theory Formula

A `TheoryFormula` is a `TheoryCube` indexed by `Literal`

~~~~~{.haskell}
type TheoryFormula = TheoryCube Literal 
~~~~~

- **Conjunction** of **assignments** of each literal to theory `Atom`

## Split `Formula` into CNF + Theory Components

### Split SMT Formulas 

An `SmtFormula` is a pair of `CnfFormula` and `TheoryFormula`

~~~~~{.haskell}
type SmtFormula    = (CnfFormula, TheoryFormula) 
~~~~~

**Theorem** There is a *poly-time* function 

~~~~~{.haskell}
toSmt :: Formula -> SmtFormula
toSmt = error "Exercise For The Reader"
~~~~~


## Split `SmtFormula` : Example 

Consider the formula

- $(a=b \vee a=c) \wedge (b=d \vee b=e) \wedge (c=d) \wedge (a \not = d) \wedge (a \not = e)$

We can split it into **CNF**

- $(x_1 \vee x_2) \wedge (x_3 \vee x_4) \wedge (x_5) \wedge (x_6) \wedge (x_7)$

And a **Theory Cube**

- $(x_1 \leftrightarrow a=b), (x_2 \leftrightarrow a=c), (x_3 \leftrightarrow b=d), (x_4 \leftrightarrow b=e)$ 
  $(x_5 \leftrightarrow c=d), (x_6 \leftrightarrow a \not = d),(x_7 \leftrightarrow a \not = e)$

## Split `SmtFormula` : Example 

Consider the formula

- $(a=b \vee a=c) \wedge (b=d \vee b=e) \wedge (c=d) \wedge (a \not = d) \wedge (a \not = e)$

We can split it into a `CnfFormula`

~~~~~{.haskell}
( [[1, 2], [3, 4], [5], [6], [7]]
~~~~~

and a `TheoryFormula`

~~~~~{.haskell}
[ (1, Rel Eq ["a", "b"]), (2, Rel Eq ["a", "c"])
, (3, Rel Eq ["b", "d"]), (4, Rel Eq ["b", "e"])
, (5, Rel Eq ["c", "d"]) 
, (6, Rel Ne ["a", "d"]), (7, Rel Ne ["a", "e"]) ]
~~~~~

<!-- z_ -->

## Combining SAT and Theory Solvers: Architecture

![SMT Solver Architecture](../static/smt-solver-full.png)

## Combining SAT and Theory Solvers: Architecture

Lets see this in code

~~~~~{.haskell}
smtSolver :: Formula -> Result
smtSolver = smtLoop . toSmt 
~~~~~

## Combining SAT and Theory Solvers: Architecture

Lets see this in code

~~~~~{.haskell}
smtLoop   :: SmtFormula -> Result 
smtLoop (cnf, thy) =                     
  case satSolver cnf of
    UNSAT -> UNSAT
    SAT s -> case theorySolver $ cube thy s of
               SAT     -> SAT
               UNSAT c -> smtLoop (c:cnf) thy
~~~~~

Where, the function

~~~~~{.haskell}
cube :: TheoryFormula -> [Literal] -> TheoryFormula  
~~~~~

Returns a **conjunction of atoms** for the `theorySolver`

## Combining SAT and Theory Solvers: Architecture

Lets see this in code

~~~~~{.haskell}
smtLoop   :: SmtFormula -> Result 
smtLoop (cnf, thy) =                     
  case satSolver cnf of
    UNSAT -> UNSAT
    SAT s -> case theorySolver $ cube thy s of
               SAT     -> SAT
               UNSAT c -> smtLoop (c:cnf) thy
~~~~~

In `UNSAT` case `theorySolver` returns **blocking clause**

- Tells `satSolver` not to find *similar* assignments ever again!

## `smtSolver` : Example 

Recall formula split into **CNF**

- $(x_1 \vee x_2) \wedge (x_3 \vee x_4) \wedge (x_5) \wedge (x_6) \wedge (x_7)$

and **Theory Cube**
- $(x_1 \leftrightarrow a=b), (x_2 \leftrightarrow a=c), (x_3 \leftrightarrow b=d), (x_4 \leftrightarrow b=e)$ 
  $(x_5 \leftrightarrow c=d), (x_6 \leftrightarrow a \not = d),(x_7 \leftrightarrow a \not = e)$

### Iteration 1: SAT

- **In** $(x_1 \vee x_2) \wedge (x_3 \vee x_4) \wedge (x_5) \wedge (x_6) \wedge (x_7)$
- **Out** `SAT` $x_1 \wedge x_3 \wedge x_5 \wedge x_6 \wedge x_7$ 

### Iteration 1: SMT

- **In** $(x_1, a=b), (x_3, b=d), (x_5, c=d), (x_6, a \not = d), (x_7, a \not = e)

- **Out** `UNSAT` (\neg x_1 \vee \neg x_3 \vee \neg x_6)

## `smtSolver` : Example 

### Iteration 2: SAT

- **In** $(x_1 \vee x_2), (x_3 \vee x_4), (x_5), (x_6), (x_7), (\neg x_1 \vee \neg x_3)$

- **Out** `SAT` $x_1 \wedge x_4 \wedge x_5 \wedge x_6 \wedge x_7$ 

### Iteration 2: SMT

- **In** $(x_1, a=b), (x_4, b=e), (x_5, c=d), (x_6, a \not = d), (x_7, a \not = e)

- **Out** `UNSAT` (\neg x_1 \vee \neg x_4 \vee \neg x_7)

## `smtSolver` : Example 

### Iteration 3 : SAT

- **In** $(x_1 \vee x_2), (x_3 \vee x_4), (x_5), (x_6), (x_7),$ 
         $(\neg x_1 \vee \neg x_3), (\neg x_1 \vee \neg x_4 \vee \neg x_7)$

- **Out** `SAT` $x_2 \wedge x_4 \wedge x_5 \wedge x_6 \wedge x_7$ 

### Iteration 3 : SMT

- **In** $(x_2, a=c), (x_4, b=e), (x_5, c=d), (x_6, a \not = d), (x_7, a \not = e)

- **Out** `UNSAT` (\neg x_2 \vee \neg x_5 \vee \neg x_6)

## `smtSolver` : Example 

### Iteration 4 : SAT

- **In** $(x_1 \vee x_2), (x_3 \vee x_4), (x_5), (x_6), (x_7),$ 
         $(\neg x_1 \vee \neg x_3), (\neg x_1 \vee \neg x_4 \vee \neg x_7)$, 
         $(\neg x_2 \vee \neg x_5 \vee \neg x_6)

- **Out** `UNSAT`

- Thus `smtSolver` returns `UNSAT`

## Today 

1. Combining SAT *and Theory* Solvers

2. **Theory Solvers**
    
    - Theory of *Equality*
    - Theory of *Uninterpreted Functions*
    - Theory of *Difference-Bounded Arithmetic*

**Issue:** How to solve formulas over *different* theories?

## Need to Solve Formulas Over Different Theories

Input formulas `F` have `Relation`, `Operator` from *different* theories

- $F \equiv f(f(a) - f(b)) \not = f(c), b \geq a, c \geq b+c, c \geq 0$

- Recall here *comma* means *conjunction*

Formula contains symbols from 

- `EUF`   : $f(a)$, $f(b)$, $=$, $\not =$,...

- `Arith` : $\geq$, $+$, $0$,...

How to solve formulas over *different* theories?

## Naive Splitting Approach

Consider $F$ over $T_E$ (e.g. `EUF`) and $T_A$ (e.g. `Arith`)

### By Theory, Split $F$ Into $F_E \wedge F_A$ 

- $F_E$ which **only contains** symbols from $T_E$
- $F_A$ which **only contains** symbols from $T_A$

Our example,

- $F \equiv f(f(a) - f(b)) \not = f(c), b \geq a, c \geq b+c, c \geq 0$

Can be split into

- $F_E \equiv f(f(a) - f(b)) \not = f(c)$  <!-- _z -->
- $F_A \equiv b \geq a, c \geq b+c , c \geq 0$

## Naive Splitting Approach

Our example,

- $F \equiv f(f(a) - f(b)) \not = f(c) , b \geq a , c \geq b+c , c \geq 0$

Can be split into

- $F_E \equiv f(f(a) - f(b)) \not = f(c)$  <!-- _z -->
- $F_A \equiv b \geq a, c \geq b+c, c \geq 0$

**Problem! Pesky "minus" operator ($-$) has crept into $F_E$ ...**

## Less Naive Splitting Approach

**Problem! Pesky "minus" operator ($-$) has crept into $F_E$ ...**

### Purify Sub-Expressions With Fresh Variables

- Replace $r(f(e)$ with $t = f(e) \wedge r(t)$

- So that each *atom* belongs to a *single* theory

Example formula $F$ becomes 

- $t_1 = f(a),  t_2 = f(b), t_3 = t_1 - t_2$

- $f(t3) \not = f(c), b \geq a, c \geq b+c, c \geq 0$

Which splits nicely into

- $F_E \equiv t_1 = f(a),  t_2 = f(b), f(t3) \not = f(c)$

- $F_A \equiv t_3 = t_1 - t_2, b \geq a, c \geq b+c, c \geq 0$


## Less Naive Splitting Approach

Consider $F$ over $T_E$ (e.g. `EUF`) and $T_A$ (e.g. `Arith`)

- **Split** $F \equiv F_E \wedge F_A$

Now what? Run theory solvers independently 

~~~~~{.haskell}
theorySolver f =
  let (fE, fA) = splitByTheory f in 
  case theorySolverE fE, theorySolverA fA of
    (UNSAT, _) -> UNSAT
    (_, UNSAT) -> UNSAT 
    (SAT, SAT) -> SAT
~~~~~

**Will it work?**

## Less Naive Splitting Approach

### Run Theory Solvers Independently 

~~~~~{.haskell}
theorySolver f =
  let (fE, fA) = splitByTheory f in 
  case theorySolverE fE, theorySolverA fA of
    (UNSAT, _) -> UNSAT
    (_, UNSAT) -> UNSAT 
    (SAT, SAT) -> SAT
~~~~~

**Will it work? Alas, no.**

## Satisfiability of Mixed Theories

Consider $F$ over $T_E$ (e.g. `EUF`) and $T_A$ (e.g. `Arith`)

- **Split** $F \equiv F_E \wedge F_A$

The following are obvious 

1. *UNSAT* $F_E$ implies *UNSAT* $F_E \wedge F_A$ implies *UNSAT* $F$
2. *UNSAT* $F_A$ implies *UNSAT* $F_E \wedge F_A$ implies *UNSAT* $F$

But this **is not true**

3. *SAT* $F_E$ and *SAT $F_A$ implies *SAT* $F_E \wedge F_A$

## Satisfiability of Mixed Theories

*SAT* $F_E$ and *SAT* $F_A$ **does not imply** *SAT* $F_E \wedge F_A$

### Example

- $F_E \equiv t_1 = f(a),  t_2 = f(b), f(t3) \not = f(c)$

- $F_A \equiv t_3 = t_1 - t_2, b \geq a, c \geq b+c, c \geq 0$

### Individual Satisfying Assignment

- Let $\sigma \equiv = a \mapsto 0, b \mapsto 0, c \mapsto 1, f \mapsto \lambda x.x$ 

- Easy to check that $\sigma$ satisfies $F_E$ and $F_A$

- (But not both!)

*One* bad assignment doesn't mean $F$ is *UNSAT*...


## Proof of Unsatisfiability of Mixed Formula $F_E \wedge F_A$ 

![Proof Of Unsatisfiability](../static/smt-mixed-unsat-proof.png)


## Satisfiability of Mixed Theories

Is quite non-trivial!

- Decision Procedure for EUF: [Ackermann, 1954](http://books.google.com/books/about/Solvable_cases_of_the_decision_problem.html?id=YTk4AAAAMAAJ)

- Decision Procedure for Arith: [Fourier, 1827](http://en.wikipedia.org/wiki/Fourier%E2%80%93Motzkin_elimination)

- Decision Procedure for EUF+Arith: [Nelson-Oppen, POPL 1978](http://scottmcpeak.com/nelson-verification.pdf)

Real software verification queries span multiple theories

- EUF + Arith + Arrays + Bit-Vectors + ...

**Good news!** The fantastic *combination* procedure of *Nelson and Oppen*...

## Nelson-Oppen Framework For Combining Theory Solvers 

### Step 1

- **Purify** each atom with fresh variables 
- **Result** each `Atom` belongs to *one* theory

### Step 2

- **Check Satisfiability** of each theory using its solver
- **Result** If *any* solver says `UNSAT` then formula is `UNSAT`

### Step 3 (Key Insight)

- **Broadcast New Equalities** discovered by *each* solver to others
- **Repeat** step 2 **Until** no new equalities discovered

## Nelson-Oppen Framework: Example

### Input

- $F \equiv f(f(a) - f(b)) \not = f(c) , b \geq a , c \geq b+c , c \geq 0$

### After Step 1 (Purify) 

- $t_1 = f(a),  t_2 = f(b), t_3 = t_1 - t_2$

- $f(t3) \not = f(c), b \geq a, c \geq b+c, c \geq 0$


## Nelson-Oppen Framework: Example

### After Step 2 (Run `EUF` on $F_E$, `Arith` on $F_A$)

- $F_E \equiv t_1 = f(a),  t_2 = f(b), f(t3) \not = f(c)$ is `SAT`

- $F_A \equiv t_3 = t_1 - t_2, b \geq a, c \geq b+c, c \geq 0$ is `SAT`

### After Step 3

- `Arith` *discovers* $a = b$

Broadcast 

- $F_E' \equiv F_E, a = b$ 

*Repeat* Step 2

## Nelson-Oppen Framework: Example

### After Step 2 (Run `EUF` on $F_E'$, `Arith` on $F_A$)

- $F_E' \equiv t_1 = f(a),  t_2 = f(b), f(t3) \not = f(c), a=b$ is `SAT`

- $F_A \equiv t_3 = t_1 - t_2, b \geq a, c \geq b+c, c \geq 0$ is `SAT`

### After Step 3

- `EUF`   *discovers* $t_1 = t_2$  

Broadcast and Update

- $F_A' \equiv F_A, t_1 = t_2$

*Repeat* Step 2

## Nelson-Oppen Framework: Example

### After Step 2 (Run `EUF` on $F_E'$, `Arith` on $F_A'$)

- $F_E' \equiv t_1 = f(a),  t_2 = f(b), f(t3) \not = f(c), a=b$ is `SAT`

- $F_A' \equiv t_3 = t_1 - t_2, b \geq a, c \geq b+c, c \geq 0, t_1 = t_2$ is `SAT`

### After Step 3

- `Arith`   *discovers* $t_3 = c$  

Broadcast and Update

- $F_E'' \equiv F_E', t_3 = c$

*Repeat* Step 2

## Nelson-Oppen Framework: Example

### After Step 2 (Run `EUF` on $F_E''$, `Arith` on $F_A'$)

- $F_E' \equiv t_1 = f(a),  t_2 = f(b), f(t3) \not = f(c), a=b, t3=c$ is `UNSAT`

- **Output** `UNSAT`

## Nelson-Oppen in Code

TODO


## Nelson-Oppen Framework For Combining Theory Solvers 

### A Theory $T$ is Stably Infinite 

If every $T$-satisfiable formula has an infinite model

- Roughly, is SAT over a universe with infinitely many *Values*

### A Theory $T$ is Convex

If whenever $F$ implies $a_1 = b_1 \vee a_2 = b_2$ 

**either** $F$ implies $a_1 = b_1$ **or** $F$ implies $a_2 = b_2$

### Theorem: Nelson-Oppen Combination

Let $T_1$, $T_2$ be *stably infinite* and *convex* theories with solvers `S1` and `S2` 

1. `nelsonOppen S1 S2` is a solver the combined theory $T_1 \cup T_2$

2. `nelsonOppen S1 S2 F` returns `SAT` iff `F` is satisfiable in $T_1 \cup T_2$.

## Convexity

The **convexity** requirement is the important one in practice.

### Example of Non-Convex Theory

$(\mathbb{Z}, +, \leq)$ and Equality

- $F \equiv 1 \leq a \leq 2, b = 1, c = 2, t_1 = f(a), t_2 = f(b), t_3 = f(c)$

- $F$ implies $t_1 = t_2 \vee t_1 = t_3$

- $F$ does not imply either $t_1 = t_2$ or $t_1 = t_3$

**Nelson-Oppen** fails on $F, t_1 \not = t_2, t_1 \not = t_3$

## Nelson-Oppen Architecture

TODO Nifty Bus PIC

What is the **API** for each Theory Solver?

## Requirements of Theory Solvers

Recall the `smtLoop` architecture

~~~~~{.haskell}
smtLoop   :: SmtFormula -> Result 
smtLoop (cnf, thy) =                     
  case satSolver cnf of
    UNSAT -> UNSAT
    SAT s -> case theorySolver $ cube thy s of
               SAT     -> SAT
               UNSAT c -> smtLoop (c:cnf) thy
~~~~~

Requirement of `theorySolver`

- `SAT`    : Each solver broadcast equalities
- `UNSAT`  : Each solver broadcast **cause** of equalities
- `theorySolver` constructs **blocking clause** from *causes*

## Building Blocking Clauses from Causes

- **Tag** each input `Atom`

- **Tag** each discovered and broadcasted equality

- **Link** each discovered fact with *tags* of its causes

- On **UNSAT** returned cause is backwards *slice* of *tags*



## Today 

1. Combining SAT *and Theory* Solvers

2. **Combining Solvers for Multiple Theories**
    
    - **Theory of Equality**
    - Theory of *Uninterpreted Functions*
    - Theory of *Difference-Bounded Arithmetic*

## Today 

1. Combining SAT *and Theory* Solvers

2. Combining Solvers for multiple theories
    
    - Theory of Equality
    - **Theory of Uninterpreted Functions**
    - Theory of *Difference-Bounded Arithmetic*

## Today 

1. Combining SAT *and Theory* Solvers

2. Combining Solvers for multiple theories

    - Theory of Equality
    - Theory of Uninterpreted Functions
    - **Theory of Difference-Bounded Arithmetic**

## Today 

1. Combining SAT *and Theory* Solvers

2. Combining Solvers for multiple theories

    - Theory of Equality
    - Theory of Uninterpreted Functions
    - Theory of Difference-Bounded Arithmetic

3. **Other Theories**
    - Lists
    - Arrays
    - Sets
    - Bitvectors 
    - ...

